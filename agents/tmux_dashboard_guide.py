from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from tasktree.agents.base import Agent, AgentContext, AgentOutput
from tasktree.core.state import StepStatus, TaskResult


@dataclass
class TmuxDashboardGuideAgent(Agent):
    id: str
    config: dict[str, Any]

    def __init__(self, config: dict[str, Any]):
        self.id = config.get("id", "tmux_dashboard_guide")
        self.config = config

    def run_step(self, action: str, ctx: AgentContext) -> AgentOutput:
        root = Path(
            self.config.get("project_root", Path(__file__).resolve().parents[1])
        )
        marker = Path(
            self.config.get("marker_path", root / "logs" / "dashboard_session.txt")
        )
        attach = ""
        launch = ""
        if marker.exists():
            for line in marker.read_text().splitlines():
                if line.startswith("attach:"):
                    attach = line.split(":", 1)[1].strip()
                if line.startswith("launcher:"):
                    launch = line.split(":", 1)[1].strip()
        pane_logs = sorted((root / "logs" / "tmux").glob("**/dashboard-status.log"))
        latest_status = pane_logs[-1].read_text() if pane_logs else ""
        summary = [
            f"action: {action}",
            f"attach: {attach or 'tmux attach -t ttx'}",
            f"launcher: {launch or './scripts/tmux_dashboard.sh --session ttx'}",
            "status_snippet:",
            latest_status[:800],
        ]
        result = TaskResult(
            status=StepStatus.SUCCESS,
            output="\n".join(summary),
            metrics={},
            learnings=[],
        )
        return AgentOutput(
            prompt="",
            raw_response="",
            parsed={},
            result=result,
        )
