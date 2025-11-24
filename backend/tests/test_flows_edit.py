from pathlib import Path

from fastapi.testclient import TestClient

from tasktree.api.app import app
from tasktree.settings import settings


def test_put_updates_flow(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr(settings, "flows_dir", tmp_path)
    flow_path = tmp_path / "demo.yaml"
    flow_path.write_text(
        "id: demo\nstart: only\nsteps:\n  - id: only\n    agent: codex_cli\n"
        "    action: investigate_error\n    transitions:\n      success: end\n"
    )

    client = TestClient(app)
    new_content = (
        "id: demo\n"
        "description: updated\n"
        "start: only\n"
        "steps:\n"
        "  - id: only\n"
        "    agent: codex_cli\n"
        "    action: investigate_error\n"
        "    transitions:\n"
        "      success: end\n"
    )

    resp = client.put("/api/flows/demo", json={"content": new_content})
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == "demo"
    assert body["description"] == "updated"
    assert "description: updated" in flow_path.read_text()


def test_put_rejects_mismatched_id(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr(settings, "flows_dir", tmp_path)
    flow_path = tmp_path / "demo.yaml"
    flow_path.write_text("id: demo\nstart: only\nsteps: []\n")

    client = TestClient(app)
    resp = client.put("/api/flows/demo", json={"content": "id: other\nstart: only\nsteps: []\n"})
    assert resp.status_code == 400
    assert "flow id mismatch" in resp.json()["detail"]


def test_create_and_delete_flow(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr(settings, "flows_dir", tmp_path)
    client = TestClient(app)

    resp = client.post(
        "/api/flows/",
        json={"id": "new_flow", "name": "New Flow", "description": "Demo"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == "new_flow"
    assert body["name"] == "New Flow"
    assert (tmp_path / "new_flow.yaml").exists()

    del_resp = client.delete("/api/flows/new_flow")
    assert del_resp.status_code == 200
    assert del_resp.json()["status"] == "deleted"
    assert not (tmp_path / "new_flow.yaml").exists()


def test_create_flow_rejects_duplicate(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr(settings, "flows_dir", tmp_path)
    flow_path = tmp_path / "dup.yaml"
    flow_path.write_text("id: dup\nstart: only\nsteps: []\n")
    client = TestClient(app)

    resp = client.post("/api/flows/", json={"id": "dup"})
    assert resp.status_code == 400
    assert "already exists" in resp.json()["detail"]


def test_create_flow_rejects_mismatched_id(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr(settings, "flows_dir", tmp_path)
    client = TestClient(app)
    resp = client.post(
        "/api/flows/",
        json={"id": "one", "content": "id: two\nstart: s\nsteps: []\n"},
    )
    assert resp.status_code == 400
    assert "id mismatch" in resp.json()["detail"]
