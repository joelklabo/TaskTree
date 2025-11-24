
#!/usr/bin/env python3
"""Test script to verify codex integration works with copilot agent."""

import yaml

from tasktree.agents.base import AgentContext, registry
from tasktree.settings import settings


def test_codex_investigation():
    """Test that codex can generate an investigation response."""

    # Load the codex config
    codex_config_path = settings.agents_dir / "codex_cli_codex.yaml"
    if not codex_config_path.exists():
        print(f"Error: {codex_config_path} not found")
        return False

    config = yaml.safe_load(codex_config_path.read_text())

    # Create the agent
    agent = registry.create("codex_cli", config)

    # Create a test context with a simple error
    test_input = {
        "error_log": "TypeError: unsupported operand type(s) for +: 'int' and 'str'",
        "error_details": {
            "error_type": "TypeError",
            "error_message": "unsupported operand type(s) for +: 'int' and 'str'",
            "file_path": "test.py",
            "line_number": 10,
            "function_name": "add_numbers",
            "full_traceback": "Traceback...",
            "context_before": ["def add_numbers(a, b):"],
            "context_after": ["    return result"],
        },
    }

    ctx = AgentContext(
        session_id="test-session",
        flow_name="log_error_handler",
        flow_version="0.3.0",
        step_name="investigate",
        input=test_input,
        strategies=[],
    )

    print("Testing codex integration...")
    print(f"Config: {config['backend_cmd']}")
    print(f"LLM enabled: {config['llm_enabled']}")
    print()

    try:
        # Run the investigation step
        result = agent.run_step("investigate_error", ctx)

        print("✅ Success!")
        print(f"Status: {result.result.status}")
        print(f"Summary: {result.parsed.get('summary', 'N/A')}")
        print(f"Learnings: {result.parsed.get('learnings', [])}")
        print()
        print("Full response:")
        print(result.raw_response)
        return True

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_codex_investigation()
    exit(0 if success else 1)
