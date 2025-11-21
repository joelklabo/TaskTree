import json
from pathlib import Path

from _pytest.monkeypatch import MonkeyPatch
from fastapi.testclient import TestClient

from tasktree.api import routes_runs
from tasktree.api.app import app


def test_traced_run_enriches_meta(tmp_path: Path, monkeypatch: MonkeyPatch) -> None:
    created: list[routes_runs.TraceRun] = []

    class DummyTraceRun(routes_runs.TraceRun):
        def __init__(self) -> None:
            super().__init__(root=tmp_path)
            created.append(self)

    monkeypatch.setattr(routes_runs, "TraceRun", DummyTraceRun)

    client = TestClient(app)
    resp = client.post(
        "/api/runs/",
        headers={"x-trace": "true"},
        json={"flow_id": "code_fix", "input": {}},
    )

    assert resp.status_code == 200
    assert created, "TraceRun was not constructed"

    meta = json.loads(created[0].meta_path.read_text(encoding="utf-8"))
    assert meta["flow_name"] == "code_fix"
    assert meta.get("label"), "label should be captured for trace list display"
    assert meta.get("flow_version")
    assert meta.get("status") in {"success", "failure"}
    assert meta.get("session_id") == resp.json()["session_id"]
    assert meta.get("exit_code") == 0
