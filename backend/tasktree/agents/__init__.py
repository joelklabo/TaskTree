from tasktree.agents.base import registry
from tasktree.agents.copilot_cli import CopilotCLIAgent
from tasktree.agents.tmux_dashboard_guide import TmuxDashboardGuideAgent

registry.register("copilot_cli", lambda cfg: CopilotCLIAgent(cfg))
registry.register("tmux_dashboard_guide", lambda cfg: TmuxDashboardGuideAgent(cfg))

__all__ = ["CopilotCLIAgent", "TmuxDashboardGuideAgent", "registry"]
