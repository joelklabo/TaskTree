from __future__ import annotations

import json
from pathlib import Path

from _pytest.monkeypatch import MonkeyPatch
from fastapi.testclient import TestClient

from tasktree.api.app import app


def test_log_digest_roundtrip(tmp_path: Path, monkeypatch: MonkeyPatch) -> None:
    monkeypatch.setenv("TASKTREE_LOG_ROOT", str(tmp_path))
    client = TestClient(app)

    payload = {
        "window_min": 10,
        "total": 3,
        "generated_at": "2025-01-01T00:00:00Z",
        "buckets": [
            {"hash": "abcd1234", "count": 2, "message": "foo", "example": "foo ex"},
            {"hash": "efgh5678", "count": 1, "message": "bar", "example": "bar ex"},
        ],
    }

    res = client.post("/api/log-digest", json=payload)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["digest"]["total"] == 3
    assert data["flow_session_id"] is None

    latest = client.get("/api/log-digest")
    assert latest.status_code == 200
    assert latest.json()["digest"]["buckets"][0]["hash"] == "abcd1234"

    history = client.get("/api/log-digest/history?limit=10")
    assert history.status_code == 200
    assert len(history.json()["items"]) == 1

    latest_path = tmp_path / "log_digest_latest.json"
    assert latest_path.exists()
    parsed = json.loads(latest_path.read_text())
    assert parsed["total"] == 3
