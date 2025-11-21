from pathlib import Path

from fastapi.testclient import TestClient

from tasktree.api.app import app
from tasktree.settings import settings


def test_constitution_route_reads_yaml(tmp_path: Path) -> None:
    const_path = tmp_path / "constitution.yaml"
    const_path.write_text("task_states:\n  start:\n    success: end\n", encoding="utf-8")
    original = settings.constitution_path
    settings.constitution_path = const_path
    try:
        client = TestClient(app)
        resp = client.get("/api/constitution/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["task_states"]["start"]["success"] == "end"
    finally:
        settings.constitution_path = original
