import pytest

from tasktree.agents.validation import ResponseValidationError, validate_standard_agent_response


def test_accepts_valid_payload() -> None:
    payload = {
        "status": "success",
        "summary": "ok",
        "commands": ["echo hi"],
        "metrics": {"time_sec": 1.2},
        "learnings": ["note"],
        "label": "tests_passed",
    }
    validated = validate_standard_agent_response(payload)
    assert validated["status"] == "success"
    assert validated["commands"] == ["echo hi"]
    assert validated["metrics"]["time_sec"] == 1.2
    assert validated["label"] == "tests_passed"


def test_requires_status() -> None:
    with pytest.raises(ResponseValidationError):
        validate_standard_agent_response({"summary": "missing status"})


def test_rejects_bad_commands_type() -> None:
    with pytest.raises(ResponseValidationError):
        validate_standard_agent_response(
            {"status": "success", "summary": "bad", "commands": "echo hi"}
        )


def test_rejects_non_numeric_metrics() -> None:
    with pytest.raises(ResponseValidationError):
        validate_standard_agent_response(
            {"status": "success", "summary": "bad metrics", "metrics": {"slow": "yes"}}
        )


def test_defaults_optional_fields() -> None:
    validated = validate_standard_agent_response({"status": "failure", "summary": "oops"})
    assert validated["commands"] == []
    assert validated["metrics"] == {}
    assert validated["learnings"] == []
    assert validated["label"] is None
