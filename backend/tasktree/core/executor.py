from __future__ import annotations

from dataclasses import dataclass
from typing import Any

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


def run_flow(flow_id: str, input_data: dict[str, Any]) -> SessionRecord:
    flow = load_flow(flow_id)
    tracer = Tracer()
    session = new_session(flow.id, flow.version)
    tracer.on_session_start(session)

    flow_input: dict[str, Any] = dict(input_data)
    node = flow.start
    current_state = "TODO"

    while node != "end":
        step_def = flow.steps[node]
        agent_cfg_path = settings.agents_dir / f"{step_def.agent}.yaml"
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

        try:
            agent_ctx = AgentContext(
                session_id=session.session_id,
                flow_name=flow.id,
                flow_version=flow.version,
                step_name=step_def.name,
                input=flow_input,
                strategies=session.strategies_applied,
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

        # Feed parsed output into context for subsequent steps.
        flow_input[step_def.name] = out.parsed

        event = result.label or result.status.value
        next_node = step_def.transitions.get(event)
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

    return session
