from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from tasktree.agents.trace.trace import TraceRun
from tasktree.core.state import SessionRecord, StepRecord, step_record_dict


class Tracer:
    """
    High-level tracing entry point used by executor and agents.
    Writes to DB (future) and to trace.jsonl if TASKTREE_TRACE_ROOT is set.
    """

    def __init__(self) -> None:
        trace_root = os.environ.get("TASKTREE_TRACE_ROOT")
        run_id = os.environ.get("TASKTREE_RUN_ID")
        self._trace_run: TraceRun | None = None
        if trace_root or run_id:
            self._trace_run = TraceRun(run_id=run_id, root=trace_root)

    def on_session_start(self, session: SessionRecord) -> None:
        # DB insertion would go here.
        if self._trace_run:
            record = {
                "run_id": session.session_id,
                "session": {
                    "session_id": session.session_id,
                    "flow_name": session.flow_name,
                    "flow_version": session.flow_version,
                    "strategies_applied": session.strategies_applied,
                    "steps": [],
                },
            }
            self._trace_run.append_trace_record(record)

    def on_step(self, step: StepRecord) -> None:
        # DB insertion would go here.
        if self._trace_run:
            self._trace_run.append_trace_record(
                {"run_id": step.session_id, "step": step_record_dict(step)}
            )

    def artifact_path(self, rel: str) -> Path:
        if not self._trace_run:
            raise RuntimeError("No trace run configured")
        p = self._trace_run.artifacts / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        return p

    @classmethod
    def log_step(
        cls,
        session_id: str,
        step: str,
        action: str,
        prompt: str,
        response: str,
        parsed: dict[str, Any],
        result: dict[str, Any],
        config: dict[str, Any] | None = None,
    ) -> None:
        tracer = cls()
        if not tracer._trace_run:
            return

        try:
            path = tracer.artifact_path(f"{step}/{action}.json")
            data = {
                "session_id": session_id,
                "step": step,
                "action": action,
                "prompt": prompt,
                "response": response,
                "parsed": parsed,
                "result": result,
                "config": config,
            }
            path.write_text(json.dumps(data, indent=2), encoding="utf-8")
        except Exception:
            # Fail safe: if writing fails, stop tracing for this run
            tracer._trace_run = None
