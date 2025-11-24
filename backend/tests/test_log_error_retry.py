"""Tests for log error handler retry logic."""

from tasktree.core.executor import run_flow


def test_log_error_handler_with_retry_success() -> None:
    """Test that retry flow works when test passes on first attempt."""
    flow_input = {
        "error_log": "TypeError: test error",
        "retry_count": 0,
        "max_retries": 2,
        "previous_attempts": [],
    }

    session = run_flow("log_error_handler", flow_input)

    # Should go: investigate -> implement -> test -> end (tests pass)
    assert session.flow_name == "log_error_handler"

    # Verify steps were executed in order
    step_names = [s.step_name for s in session.steps]
    assert step_names == ["investigate", "implement", "test"]

    # Should end with tests_passed
    assert session.steps[-1].result.label == "tests_passed"


def test_log_error_handler_retry_on_test_failure() -> None:
    """Test that flow retries when tests fail."""
    # This test documents the expected behavior when tests fail.
    # Full implementation requires agent config override to return tests_failed.

    # Expected flow with test failures:
    # investigate -> implement -> test (fail) -> retry_or_triage -> investigate (retry)
    # After max retries: -> triage

    # TODO: Implement agent config override mechanism to test retry path
    # flow_input = {
    #     "error_log": "TypeError: test error",
    #     "retry_count": 0,
    #     "max_retries": 2,
    #     "previous_attempts": [],
    # }
    # session = run_flow("log_error_handler", flow_input, agent_config="codex_cli_retry_test")
    # assert session.steps[-1].step_name == "triage"
    pass


def test_context_accumulation_structure() -> None:
    """Test that flow input has correct structure for context accumulation."""
    flow_input = {
        "error_log": "TypeError: test",
        "retry_count": 1,
        "max_retries": 2,
        "previous_attempts": [
            {
                "iterate": 0,
                "investigate_summary": "First investigation",
                "implement_summary": "First fix attempt",
                "test_result": "tests failed",
                "learnings": ["Learned something"],
            }
        ],
    }

    # This test just validates the structure - actual accumulation
    # happens in the executor when retrying
    assert flow_input["retry_count"] == 1
    assert isinstance(flow_input["previous_attempts"], list)
    assert len(flow_input["previous_attempts"]) == 1
    assert isinstance(flow_input["previous_attempts"][0], dict)
    assert flow_input["previous_attempts"][0]["iterate"] == 0
