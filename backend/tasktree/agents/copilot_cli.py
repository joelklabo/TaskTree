from tasktree.agents.codex_cli import CodexCLIAgent, CodexConfig

# Backward compatibility: export previous names pointing to Codex CLI implementation.
CopilotCLIAgent = CodexCLIAgent
CopilotConfig = CodexConfig

__all__ = ["CodexCLIAgent", "CodexConfig", "CopilotCLIAgent", "CopilotConfig"]
