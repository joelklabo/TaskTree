import time
from pathlib import Path

from fastapi.testclient import TestClient

from tasktree.api.app import app
from tasktree.settings import settings


def _write_simple_flow(dir_path: Path) -> str:
    flow_id = "ctrl_flow"
    flow_path = dir_path / f"{flow_id}.yaml"
    flow_path.write_text(
        "id: ctrl_flow\n"
        "start: first\n"
        "steps:\n"
        "  - id: first\n"
        "    agent: codex_cli\n"
        "    action: investigate_error\n"
        "    transitions:\n"
        "      success: end\n"
    )
    return flow_id


def test_controlled_run_pauses_and_resumes(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr(settings, "flows_dir", tmp_path)
    # Mock agents dir to avoid FileNotFoundError for codex_cli.yaml
    # The executor needs to find the agent config.
    # We can mock settings.agents_dir or write the file.
    agents_dir = tmp_path / "agents"
    agents_dir.mkdir()
    (agents_dir / "codex_cli.yaml").write_text("id: codex_cli\nllm_enabled: false\n")
    monkeypatch.setattr(settings, "agents_dir", agents_dir)
    
    # Mock prompts dir too, as CodexCLIAgent loads templates
    prompts_dir = tmp_path / "prompts"
    prompts_dir.mkdir()
    (prompts_dir / "error_investigate.j2").write_text("mock prompt")
    monkeypatch.setattr(settings, "prompts_dir", prompts_dir)
    
    flow_id = _write_simple_flow(tmp_path)

    client = TestClient(app)
    start_resp = client.post(
        f"/api/flows/{flow_id}/run-controlled", json={"input": {}, "breakpoints": ["first"]}
    )
    if start_resp.status_code != 200:
        print(f"DEBUG: {start_resp.json()}")
    assert start_resp.status_code == 200
    session_id = start_resp.json()["session_id"]

    # Should be paused after first step
    events = client.get(f"/api/runs/{session_id}/events").json()
    assert any(ev["type"] == "paused" for ev in events)

    resume_resp = client.post(f"/api/runs/{session_id}/resume")
    assert resume_resp.status_code == 200

    # Wait briefly for completion
    timeout = time.time() + 5
    finished = False
    while time.time() < timeout:
        events = client.get(f"/api/runs/{session_id}/events").json()
        if any(ev["type"] == "completed" for ev in events):
            finished = True
            break
        time.sleep(0.1)
    assert finished, "controlled run should complete after resume"
