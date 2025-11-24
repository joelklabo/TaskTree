from tasktree.agents import registry
from tasktree.agents.codex_cli import CodexCLIAgent


def test_codex_cli_is_registered() -> None:
    agent = registry.create("codex_cli", {})
    assert isinstance(agent, CodexCLIAgent)
