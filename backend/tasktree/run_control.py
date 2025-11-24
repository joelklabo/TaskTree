
from __future__ import annotations

import threading
import time
from dataclasses import dataclass, field
from typing import Any

from tasktree import log_events
from tasktree.core.executor import StepObserver, run_flow


@dataclass
class StepEvent:
    type: str
    step: str | None = None
    data: dict[str, Any] | None = None
    ts: float = field(default_factory=time.time)


@dataclass
class ControlledRun:
    session_id: str
    events: list[StepEvent] = field(default_factory=list)
    pause_after: set[str] = field(default_factory=set)
    resume_signal: threading.Event = field(default_factory=threading.Event)
    thread: threading.Thread | None = None
    completed: bool = False
    error: str | None = None


class ControlledRunObserver(StepObserver):
    def __init__(self, run: ControlledRun, lock: threading.Lock) -> None:
        self.run = run
        self.lock = lock

    def on_step_start(self, session: Any, step: Any, flow_input: dict[str, Any]) -> None:
        if not self.run.session_id:
            self.run.session_id = session.session_id
        self._append("step_start", step=step.name, data={"flow_input": flow_input})
        log_events.publish(
            {"type": "run_step_start", "session_id": session.session_id, "step": step.name}
        )

    def on_step_end(self, session: Any, step_record: Any, flow_input: dict[str, Any]) -> None:
        self._append(
            "step_end",
            step=step_record.step_name,
            data={
                "result": {
                    "status": step_record.result.status.value,
                    "label": step_record.result.label,
                },
                "flow_input": flow_input,
            },
        )
        log_events.publish(
            {
                "type": "run_step_end",
                "session_id": session.session_id,
                "step": step_record.step_name,
                "status": step_record.result.status.value,
            }
        )

    def on_pause(self, session: Any, step_record: Any) -> None:
        self._append("paused", step=step_record.step_name)
        log_events.publish(
            {"type": "run_paused", "session_id": session.session_id, "step": step_record.step_name}
        )

    def _append(
        self, type_: str, step: str | None = None, data: dict[str, Any] | None = None
    ) -> None:
        with self.lock:
            self.run.events.append(StepEvent(type=type_, step=step, data=data))


class RunControlManager:
    """Coordinates controlled runs that can pause after steps."""

    def __init__(self) -> None:
        self._runs: dict[str, ControlledRun] = {}
        self._lock = threading.Lock()

    def start_run(
        self, flow_id: str, input_data: dict[str, Any], pause_after: set[str]
    ) -> ControlledRun:
        container = ControlledRun(session_id="", pause_after=pause_after)
        observer = ControlledRunObserver(container, self._lock)

        def pause_callback(phase: str, step: str, context: dict[str, Any]) -> None:
            container.resume_signal.clear()
            container.resume_signal.wait()

        def should_pause(phase: str, step: str, context: dict[str, Any]) -> bool:
            return phase == "after" and step in pause_after

        def target() -> None:
            try:
                session = run_flow(
                    flow_id,
                    input_data,
                    observer=observer,
                    should_pause=should_pause,
                    pause_event=pause_callback,
                )
                container.session_id = session.session_id
                with self._lock:
                    container.events.append(
                        StepEvent(type="completed", data={"steps": len(session.steps)})
                    )
                container.completed = True
                log_events.publish(
                    {
                        "type": "run_completed",
                        "session_id": session.session_id,
                        "steps": len(session.steps),
                    }
                )
            except Exception as exc:  # pragma: no cover - surfaced in tests via events
                container.error = str(exc)
                with self._lock:
                    container.events.append(StepEvent(type="error", data={"message": str(exc)}))
                log_events.publish({"type": "run_error", "message": str(exc)})

        thread = threading.Thread(target=target, daemon=True)
        container.thread = thread
        with self._lock:
            self._runs[str(id(container))] = container
        thread.start()
        # session_id becomes available on first step start
        start_time = time.time()
        while not container.session_id and time.time() - start_time < 1.0:
            time.sleep(0.01)
        if pause_after:
            wait_start = time.time()
            while time.time() - wait_start < 1.0:
                with self._lock:
                    if any(ev.type == "paused" for ev in container.events):
                        break
                time.sleep(0.01)
        return container

    def resume(self, session_id: str) -> bool:
        run = self._find_by_session(session_id)
        if not run:
            return False
        run.resume_signal.set()
        return True

    def events(self, session_id: str) -> list[dict[str, Any]]:
        run = self._find_by_session(session_id)
        if not run:
            return []
        with self._lock:
            return [
                {"type": ev.type, "step": ev.step, "ts": ev.ts, "data": ev.data}
                for ev in run.events
            ]

    def _find_by_session(self, session_id: str) -> ControlledRun | None:
        with self._lock:
            for run in self._runs.values():
                if run.session_id == session_id:
                    return run
        return None


run_control = RunControlManager()
