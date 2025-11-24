import json
import os
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from tasktree.agents.trace.trace import TraceRun
from tasktree.core.executor import run_flow
from tasktree.core.state import SessionRecord, StepStatus, step_record_dict
from tasktree.run_control import run_control

router = APIRouter()


class RunRequest(BaseModel):
    flow_id: str
    input: dict[str, Any] = {}


def _session_artifact(session: SessionRecord) -> dict[str, Any]:
    return {
        "session_id": session.session_id,
        "flow_name": session.flow_name,
        "flow_version": session.flow_version,
        "steps": [step_record_dict(s) for s in session.steps],
    }


@router.post("/")
def run(req: RunRequest, x_trace: str | None = Header(default=None)) -> dict[str, Any]:
    trace_run: TraceRun | None = None
    if x_trace and x_trace.lower() == "true":
        trace_run = TraceRun()
        os.environ["TASKTREE_TRACE_ROOT"] = str(trace_run.root)
        os.environ["TASKTREE_RUN_ID"] = trace_run.run_id
        trace_run.write_meta_start(["api", "run"], str(Path.cwd()))

    session = run_flow(req.flow_id, req.input)

    trace_exit_code = 0
    if trace_run:
        summary = _session_artifact(session)
        artifacts_dir = trace_run.artifacts
        artifacts_dir.mkdir(parents=True, exist_ok=True)
        (artifacts_dir / "session_summary.json").write_text(json.dumps(summary, indent=2))
        steps_dir = artifacts_dir / "steps"
        steps_dir.mkdir(parents=True, exist_ok=True)
        for step in session.steps:
            (steps_dir / f"{step.step_name}.json").write_text(
                json.dumps(step_record_dict(step), indent=2)
            )
        trace_exit_code = (
            0 if all(step.result.status == StepStatus.SUCCESS for step in session.steps) else 1
        )
        final_label = next(
            (s.result.label for s in reversed(session.steps) if s.result.label), None
        )
        status_label = "success" if trace_exit_code == 0 else "failure"
        trace_run.update_meta(
            {
                "flow_name": session.flow_name,
                "flow_version": session.flow_version,
                "label": final_label
                or (session.steps[-1].result.status.value if session.steps else None),
                "status": status_label,
                "session_id": session.session_id,
            }
        )
        trace_run.write_meta_end(trace_exit_code)
        os.environ.pop("TASKTREE_TRACE_ROOT", None)
        os.environ.pop("TASKTREE_RUN_ID", None)

    return {
        "session_id": session.session_id,
        "flow_name": session.flow_name,
        "trace_run_id": trace_run.run_id if trace_run else None,
        "steps": [
            {
                "step_name": s.step_name,
                "agent": s.agent_name,
                "status": s.result.status.value,
                "label": s.result.label,
            }
            for s in session.steps
        ],
    }


class ControlledRunRequest(BaseModel):
    input: dict[str, Any] = {}
    breakpoints: list[str] | None = None


@router.post("/controlled/{flow_id}")
def start_controlled_run(flow_id: str, req: ControlledRunRequest) -> dict[str, Any]:
    pause_after = set(req.breakpoints) if req.breakpoints else set()
    controlled = run_control.start_run(flow_id, req.input, pause_after)
    if not controlled.session_id:
        raise HTTPException(status_code=500, detail="failed to start controlled run")
    return {
        "session_id": controlled.session_id,
        "flow_name": flow_id,
        "steps": [],
        "status": "running",
    }


@router.post("/{session_id}/resume")
def resume_run(session_id: str) -> dict[str, str]:
    ok = run_control.resume(session_id)
    if not ok:
        raise HTTPException(status_code=404, detail="session not found")
    return {"status": "resumed"}


@router.get("/{session_id}/events")
def run_events(session_id: str) -> list[dict[str, Any]]:
    events = run_control.events(session_id)
    if not events:
        return []
    return events
