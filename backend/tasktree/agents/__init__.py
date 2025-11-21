from tasktree.agents.base import registry
from tasktree.agents.copilot_cli import CopilotCLIAgent

registry.register("copilot_cli", lambda cfg: CopilotCLIAgent(cfg))

__all__ = ["CopilotCLIAgent", "registry"]
