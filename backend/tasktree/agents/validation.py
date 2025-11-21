from __future__ import annotations

from typing import Any


class ResponseValidationError(ValueError):
    pass


def validate_standard_agent_response(payload: dict[str, Any]) -> dict[str, Any]:
    """
    Validate and normalize a typical agent response payload.

    Expected shape:
    {
      "status": "success" | "failure",
      "summary" | "output": str,
      "commands": [str, ...],
      "metrics": {str: number},
      "learnings": [str, ...],
      "label": str | None,
    }
    """
    if not isinstance(payload, dict):
        raise ResponseValidationError("Response must be a JSON object")

    status = payload.get("status")
    if status not in ("success", "failure"):
        raise ResponseValidationError("status must be 'success' or 'failure'")

    summary = payload.get("summary") or payload.get("output")
    if not isinstance(summary, str):
        raise ResponseValidationError("summary/output must be a string")

    commands_raw = payload.get("commands", [])
    if not isinstance(commands_raw, list) or not all(isinstance(cmd, str) for cmd in commands_raw):
        raise ResponseValidationError("commands must be a list of strings")
    commands = commands_raw

    metrics_raw = payload.get("metrics", {}) or {}
    if not isinstance(metrics_raw, dict) or not all(
        isinstance(k, str) and isinstance(v, (int, float)) for k, v in metrics_raw.items()
    ):
        raise ResponseValidationError("metrics must be a mapping of string keys to numbers")
    metrics = metrics_raw

    learnings_raw = payload.get("learnings", [])
    if not isinstance(learnings_raw, list) or not all(
        isinstance(item, str) for item in learnings_raw
    ):
        raise ResponseValidationError("learnings must be a list of strings")
    learnings = learnings_raw

    label = payload.get("label")
    if label is not None and not isinstance(label, str):
        raise ResponseValidationError("label must be a string when provided")

    return {
        "status": status,
        "summary": summary,
        "commands": commands,
        "metrics": metrics,
        "learnings": learnings,
        "label": label,
    }
