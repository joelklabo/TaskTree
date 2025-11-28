from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient

from tasktree.api import routes_trace
from tasktree.api.app import app


def _write_trace(run_dir: Path, steps: list[dict[str, object]]) -> None:
    run_dir.mkdir(parents=True, exist_ok=True)
    trace_file = run_dir / "trace.jsonl"
    with trace_file.open("w") as f:
        session_record = {
            "run_id": run_dir.name,
            "session": {
                "flow_name": "code_fix",
                "flow_version": "0.1.0",
                "start_time": "2025-01-01T00:00:00Z",
                "end_time": "2025-01-01T00:00:05Z",
            },
        }
        f.write(json.dumps(session_record) + "\n")
        for step in steps:
            f.write(json.dumps({"run_id": run_dir.name, "step": step}) + "\n")


def test_trace_compare_endpoint(monkeypatch, tmp_path: Path) -> None:
    # Arrange sample traces with a mismatch and a missing step
    a_steps = [
        {"step_name": "plan", "status": "success", "duration_ms": 100},
        {"step_name": "run", "status": "success", "duration_ms": 200},
    ]
    b_steps = [
        {"step_name": "plan", "status": "failure", "duration_ms": 120},
        {"step_name": "review", "status": "success", "duration_ms": 150},
    ]

    run_a = tmp_path / "run-a"
    run_b = tmp_path / "run-b"
    _write_trace(run_a, a_steps)
    _write_trace(run_b, b_steps)

    monkeypatch.setattr(routes_trace, "TRACE_ROOT", tmp_path)

    client = TestClient(app)

    # Act
    res = client.get("/api/trace/compare", params={"run_a": "run-a", "run_b": "run-b"})

    # Assert
    assert res.status_code == 200
    data = res.json()
    assert data["runs"]["a"]["run_id"] == "run-a"
    assert data["runs"]["b"]["run_id"] == "run-b"

    steps = {row["step_name"]: row for row in data["steps"]}
    # Common step shows statuses and duration delta
    plan = steps["plan"]
    assert plan["a"]["status"] == "success"
    assert plan["b"]["status"] == "failure"
    assert plan["delta"]["status_changed"] is True
    assert plan["delta"]["duration_ms"] == 20

    # Missing in B -> no entry under b
    run_step = steps["run"]
    assert run_step["b"] is None

    # Missing in A -> no entry under a
    review_step = steps["review"]
    assert review_step["a"] is None

    summary = data["summary"]
    assert summary["mismatched"] == 1
    assert summary["missing_in_a"] == 1
    assert summary["missing_in_b"] == 1


def test_trace_compare_404(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr(routes_trace, "TRACE_ROOT", tmp_path)
    client = TestClient(app)
    res = client.get("/api/trace/compare", params={"run_a": "x", "run_b": "y"})
    assert res.status_code == 404
