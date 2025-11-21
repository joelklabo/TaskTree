from tasktree.agents import registry
from tasktree.agents.copilot_cli import CopilotCLIAgent


def test_copilot_cli_is_registered() -> None:
    agent = registry.create("copilot_cli", {})
    assert isinstance(agent, CopilotCLIAgent)
