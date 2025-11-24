
import threading
from typing import Any

from tasktree.core.executor import SessionRecord, run_flow


class DebugSession:
    def __init__(
        self,
        flow_id: str,
        input_data: dict[str, Any],
        agent_profile: str | None = None,
        *,
        scenario_id: str | None = None,
        prompt_overrides: dict[str, str] | None = None,
    ) -> None:
        self.flow_id = flow_id
        self.input_data = input_data
        self.agent_profile = agent_profile
        self.scenario_id = scenario_id
        self.prompt_overrides = prompt_overrides or {}
        self.session_record: SessionRecord | None = None
        self.thread: threading.Thread | None = None
        self.pause_event = threading.Event()  # Set when paused
        self.resume_event = threading.Event()  # Set to resume
        self.current_step: str | None = None
        self.current_phase: str | None = None
        self.current_context: dict[str, Any] | None = None
        self.breakpoints: set[str] = set()
        self.pause_next = False  # For "Step"
        self.is_running = False

    def start(self) -> None:
        self.is_running = True
        self.thread = threading.Thread(target=self._run)
        self.thread.start()

    def _run(self) -> None:
        def should_pause(phase: str, step: str, context: dict[str, Any]) -> bool:
            if self.pause_next:
                self.pause_next = False
                return True
            if step in self.breakpoints and phase == "before":
                return True
            return False

        def on_pause(phase: str, step: str, context: dict[str, Any]) -> None:
            self.current_phase = phase
            self.current_step = step
            self.current_context = context
            # self.pause_next = False # Moved to should_pause
            self.pause_event.set()  # Notify we are paused
            
            self.resume_event.wait()  # Wait for resume
            self.resume_event.clear()
            
            self.pause_event.clear()
            self.current_step = None
            self.current_phase = None
            self.current_context = None

        try:
            self.session_record = run_flow(
                self.flow_id,
                self.input_data,
                should_pause=should_pause,
                pause_event=on_pause,
                agent_profile=self.agent_profile,
                scenario_id=self.scenario_id,
                prompt_overrides=self.prompt_overrides,
            )
        finally:
            self.is_running = False
            self.pause_event.set()  # Ensure anyone waiting on pause knows we finished

    def resume(self) -> None:
        self.resume_event.set()

    def step(self) -> None:
        self.pause_next = True
        self.resume_event.set()

    def add_breakpoint(self, step: str) -> None:
        self.breakpoints.add(step)

    def remove_breakpoint(self, step: str) -> None:
        self.breakpoints.discard(step)
