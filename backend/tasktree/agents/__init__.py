from tasktree.agents.base import registry
from tasktree.agents.codex_cli import CodexCLIAgent
from tasktree.agents.copilot_cli import CopilotCLIAgent

registry.register("codex_cli", lambda cfg: CodexCLIAgent(cfg))
registry.register("copilot_cli", lambda cfg: CopilotCLIAgent(cfg))
registry.register("copilot_cli_proof", lambda cfg: CopilotCLIAgent(cfg))

__all__ = ["CodexCLIAgent", "CopilotCLIAgent", "registry"]
