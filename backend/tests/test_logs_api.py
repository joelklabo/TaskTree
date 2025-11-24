from pathlib import Path

from fastapi.testclient import TestClient

from tasktree.api.app import app


def test_logs_sources_and_tail(tmp_path: Path, monkeypatch) -> None:
    logs_dir = tmp_path / "logs"
    logs_dir.mkdir()
    log_file = logs_dir / "demo.log"
    log_file.write_text("line1\nline2\nline3\n", encoding="utf-8")

    # Point logger discovery to the temp logs dir
    monkeypatch.setenv("TASKTREE_LOG_ROOT", str(log_file.parent))

    client = TestClient(app)
    sources_resp = client.get("/api/logs/sources")
    assert sources_resp.status_code == 200
    sources = sources_resp.json()
    demo = next(src for src in sources if src["name"] == "demo.log")
    assert demo["description"]

    tail_resp = client.get(
        "/api/logs/tail", params={"source": "demo.log", "lines": 2, "contains": "line"}
    )
    assert tail_resp.status_code == 200
    body = tail_resp.json()
    assert body["source"] == "demo.log"
    assert body["lines"] == ["line2", "line3"]


def test_logs_tail_rejects_unknown_source(tmp_path: Path, monkeypatch) -> None:
    logs_dir = tmp_path / "logs"
    logs_dir.mkdir()
    monkeypatch.setenv("TASKTREE_LOG_ROOT", str(logs_dir))

    client = TestClient(app)
    resp = client.get("/api/logs/tail", params={"source": "missing.log"})
    assert resp.status_code == 404


def test_logs_tail_since_filters_old(tmp_path: Path, monkeypatch) -> None:
    logs_dir = tmp_path / "logs"
    logs_dir.mkdir()
    log_file = logs_dir / "old.log"
    log_file.write_text("old\n", encoding="utf-8")
    monkeypatch.setenv("TASKTREE_LOG_ROOT", str(logs_dir))

    client = TestClient(app)
    older = log_file.stat().st_mtime + 10
    resp = client.get("/api/logs/tail", params={"source": "old.log", "since_ts": older})
    assert resp.status_code == 200
    assert resp.json()["lines"] == []


def test_events_endpoint_consumes_queue() -> None:
    client = TestClient(app)

    # publish via debug endpoint
    resp = client.post(
        "/api/debug/log-client-error",
        json={"message": "boom", "name": "Client", "stack": "trace", "context": {}},
    )
    assert resp.status_code == 200

    events_resp = client.get("/api/logs/events")
    assert events_resp.status_code == 200
    events = events_resp.json()["events"]
    assert any(ev["type"] == "log_error" for ev in events)

    # subsequent call should be empty (consumed)
    second = client.get("/api/logs/events").json()["events"]
    assert second == []


def test_stream_endpoint_returns_sse(tmp_path: Path, monkeypatch) -> None:
    logs_dir = tmp_path / "logs"
    logs_dir.mkdir()
    log_file = logs_dir / "demo.log"
    log_file.write_text("first\nsecond\n", encoding="utf-8")
    monkeypatch.setenv("TASKTREE_LOG_ROOT", str(logs_dir))

    client = TestClient(app)
    with client.stream("GET", "/api/logs/stream?source=demo.log&interval=0.1&once=true") as resp:
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("text/event-stream")
        first = next(resp.iter_text())
        assert "data:" in first
