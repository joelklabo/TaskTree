

from __future__ import annotations

import os
import time
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any, Protocol

import yaml

from tasktree.agents.base import AgentContext, registry
from tasktree.coord.constitution import constitution, next_state
from tasktree.coord.leases import Lease, acquire, release
from tasktree.core.state import (
    SessionRecord,
    StepRecord,
    new_session,
    now_utc_iso,
)
from tasktree.settings import settings
from tasktree.tracing import Tracer


def _debug_log(
    session_id: str, event_type: str, message: str, scenario_id: str | None = None
) -> None:
    """Write to combined debug log."""
    log_dir = settings.base_dir.parent / "logs"
    log_dir.mkdir(exist_ok=True)
    debug_file = log_dir / "debug.log"
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    scenario_tag = None
    if scenario_id:
        scenario_tag = scenario_id if str(scenario_id).startswith("scn-") else f"scn-{scenario_id}"
    scenario_part = f" [{scenario_tag}]" if scenario_tag else ""
    with debug_file.open("a", encoding="utf-8") as f:
        f.write(f"[{timestamp}] {event_type:8} {session_id[:8]}{scenario_part} | {message}\n")


@dataclass
class StepDef:
    name: str
    agent: str
    action: str
    resources: list[str]
    transitions: dict[str, str]


@dataclass
class FlowDef:
    id: str
    version: str
    description: str
    start: str
    steps: dict[str, StepDef]


def load_flow(flow_id: str) -> FlowDef:
    path = settings.flows_dir / f"{flow_id}.yaml"
    if not path.exists():
        raise FileNotFoundError(f"Flow config not found at {path}")
    data = yaml.safe_load(path.read_text())
    steps = {
        step["id"]: StepDef(
            name=step["id"],
            agent=step["agent"],
            action=step["action"],
            resources=step.get("resources", []),
            transitions=step.get("transitions", {}),
        )
        for step in data["steps"]
    }
    return FlowDef(
        id=data["id"],
        version=str(data.get("version", "0.0.0")),
        description=data.get("description", ""),
        start=data["start"],
        steps=steps,
    )


class StepObserver(Protocol):
    def on_step_start(
        self, session: SessionRecord, step: StepDef, flow_input: dict[str, Any]
    ) -> None: ...

    def on_step_end(
        self, session: SessionRecord, step_record: StepRecord, flow_input: dict[str, Any]
    ) -> None: ...

    def on_pause(self, session: SessionRecord, step_record: StepRecord) -> None: ...


def _assert_resource_access(agent_id: str, resource: str) -> None:
    """Ensure protected resources are only touched by their owner."""
    norm_resource = resource.replace("**", "").rstrip("/")
    conf = constitution()
    for protected in conf.protected:
        protected_norm = protected.rstrip("/")
        if norm_resource.startswith(protected_norm):
            owner = conf.ownership.get(protected_norm, conf.ownership.get(protected, None))
            if owner and owner != agent_id:
                raise PermissionError(
                    f"Agent '{agent_id}' is not allowed to modify protected resource '{resource}' "
                    f"(owned by '{owner}')"
                )


def run_flow(
    flow_id: str,
    input_data: dict[str, Any],
    *,
    observer: StepObserver | None = None,
    # (phase, step_name, context) -> bool
    should_pause: Callable[[str, str, dict[str, Any]], bool] | None = None,
    # (phase, step_name, context) -> None
    pause_event: Callable[[str, str, dict[str, Any]], None] | None = None,
    agent_profile: str | None = None,
    scenario_id: str | None = None,
    prompt_overrides: dict[str, str] | None = None,
) -> SessionRecord:
    flow = load_flow(flow_id)
    tracer = Tracer()
    session = new_session(flow.id, flow.version)
    tracer.on_session_start(session)

    scenario = scenario_id or input_data.get("scenario_id") or input_data.get("_scenario_id")
    _debug_log(
        session.session_id,
        "FLOW",
        f"Started flow '{flow_id}' v{flow.version}",
        scenario_id=scenario,
    )

    flow_input: dict[str, Any] = dict(input_data)
    if scenario and "_scenario_id" not in flow_input:
        flow_input["_scenario_id"] = scenario
    # Retry defaults for iterative implementer flows
    if "retry_count" not in flow_input:
        flow_input["retry_count"] = 0
    if "max_retries" not in flow_input:
        flow_input["max_retries"] = 5
    node = flow.start
    current_state = "TODO"

    while node != "end":
        step_def = flow.steps[node]
        
        # Pause Before
        if should_pause and should_pause("before", step_def.name, flow_input):
            _debug_log(
                session.session_id,
                "PAUSE",
                f"Paused before step '{step_def.name}'",
                scenario_id=scenario,
            )
            if pause_event:
                pause_event("before", step_def.name, flow_input)

        env_profile = agent_profile or os.getenv("TASKTREE_AGENT_PROFILE") or os.getenv(
            f"TASKTREE_AGENT_PROFILE_{step_def.agent.upper()}"
        )
        agent_file = f"{env_profile}.yaml" if env_profile else f"{step_def.agent}.yaml"
        agent_cfg_path = settings.agents_dir / agent_file
        if not agent_cfg_path.exists():
            raise FileNotFoundError(f"Agent config not found at {agent_cfg_path}")
        agent_cfg = yaml.safe_load(agent_cfg_path.read_text())
        try:
            agent = registry.create(step_def.agent, agent_cfg)
        except KeyError as exc:
            raise KeyError(f"Agent '{step_def.agent}' not registered") from exc

        # leases
        leases: list[Lease] = []
        for res in step_def.resources:
            _assert_resource_access(step_def.agent, res)
            leases.append(acquire(res, step_def.agent))

        _debug_log(
            session.session_id,
            "STEP",
            f"Starting step '{step_def.name}' with action '{step_def.action}'",
            scenario_id=scenario,
        )
        if observer:
            observer.on_step_start(session, step_def, dict(flow_input))

        try:
            agent_ctx = AgentContext(
                session_id=session.session_id,
                flow_name=flow.id,
                flow_version=flow.version,
                step_name=step_def.name,
                input=flow_input,
                strategies=session.strategies_applied,
                metadata={
                    "scenario_id": scenario,
                    "prompt_overrides": prompt_overrides or {},
                },
            )
            out = agent.run_step(step_def.action, agent_ctx)
        finally:
            for lease in leases:
                release(lease)

        result = out.result
        step_record = StepRecord(
            session_id=session.session_id,
            flow_name=flow.id,
            flow_version=flow.version,
            step_name=step_def.name,
            agent_name=step_def.agent,
            prompt=out.prompt,
            raw_response=out.raw_response,
            parsed=out.parsed,
            result=result,
            ts_utc=now_utc_iso(),
        )
        session.steps.append(step_record)
        tracer.on_step(step_record)

        _debug_log(
            session.session_id,
            "RESULT",
            f"Step '{step_def.name}' completed: status={result.status.value}, label={result.label}",
            scenario_id=scenario,
        )

        if observer:
            observer.on_step_end(session, step_record, dict(flow_input))
        
        # Pause After
        if should_pause and should_pause("after", step_def.name, flow_input):
            _debug_log(
                session.session_id,
                "PAUSE",
                f"Paused after step '{step_def.name}'",
                scenario_id=scenario,
            )
            if observer:
                observer.on_pause(session, step_record)
            if pause_event:
                pause_event("after", step_def.name, flow_input)

        # Feed parsed output into context for subsequent steps.
        flow_input[step_def.name] = out.parsed

        # Accumulate full LLM transcript for downstream steps
        if "_llm_transcript" not in flow_input:
            flow_input["_llm_transcript"] = []
        flow_input["_llm_transcript"].append(
            {
                "step": step_def.name,
                "action": step_def.action,
                "prompt": out.prompt,
                "response": out.raw_response,
                "parsed": out.parsed,
            }
        )

        event = result.label or result.status.value
        if step_def.action == "implement_feature_iterative" and event == "needs_retry":
            flow_input["retry_count"] = int(flow_input.get("retry_count", 0)) + 1
            max_retries = int(flow_input.get("max_retries", 5))
            if flow_input["retry_count"] >= max_retries:
                event = "issue_needed"
                _debug_log(
                    session.session_id,
                    "RETRY",
                    f"Max retries reached ({flow_input['retry_count']}/{max_retries})",
                    scenario_id=scenario,
                )
        next_node = step_def.transitions.get(event)
        _debug_log(
            session.session_id,
            "TRANS",
            f"Event '{event}' -> next_node='{next_node}'",
            scenario_id=scenario,
        )
        if next_node:
            node = next_node
            continue

        maybe_state = next_state(current_state, event)
        if maybe_state:
            current_state = maybe_state
            node = "end"
            continue

        raise RuntimeError(
            f"No transition for event '{event}' from step '{step_def.name}' "
            f"in flow '{flow.id}' (state '{current_state}')"
        )

    _debug_log(
        session.session_id,
        "FLOW",
        f"Completed flow '{flow.id}' with {len(session.steps)} steps",
        scenario_id=scenario,
    )
    return session
