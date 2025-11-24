from __future__ import annotations

from pathlib import Path

from _pytest.monkeypatch import MonkeyPatch
from fastapi.testclient import TestClient

from tasktree.api.app import app
from tasktree.prompt_introspect import extract_input_fields


def test_extract_input_fields() -> None:
    src = "{{ input.foo }} {{ input['bar'] }} {{ input.baz_qux }}"
    fields = extract_input_fields(src)
    assert set(fields) == {"foo", "bar", "baz_qux"}


def test_prompt_skeleton_api(tmp_path: Path, monkeypatch: MonkeyPatch) -> None:
    # Use real prompts dir; ensure agent config points there
    monkeypatch.setenv("TASKTREE_PROMPTS_DIR", str(tmp_path))  # not used but reserved
    client = TestClient(app)
    res = client.get(
        "/api/prompts/skeleton",
        params={"action": "implement_feature", "agent": "codex_cli"},
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["action"] == "implement_feature"
    skeleton = data["skeleton"]
    assert "input" in skeleton
    # Should include keys used in feature_impl.j2
    keys = set(skeleton["input"].keys())
    assert "feature_spec" in keys
    assert "history" in keys


def test_prompt_skeleton_by_template(monkeypatch: MonkeyPatch) -> None:
    client = TestClient(app)
    res = client.get("/api/prompts/skeleton", params={"template": "feature_impl.j2"})
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["template"] == "feature_impl.j2"
    assert "feature_spec" in data["skeleton"]["input"]
