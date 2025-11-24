from pathlib import Path

import yaml

from tasktree.core.executor import run_flow
from tasktree.settings import settings


def _write_flow(tmp_dir: Path) -> str:
    flow_id = "profile_flow"
    flow_path = tmp_dir / f"{flow_id}.yaml"
    flow_path.write_text(
        "id: profile_flow\n"
        "start: first\n"
        "steps:\n"
        "  - id: first\n"
        "    agent: codex_cli\n"
        "    action: investigate_error\n"
        "    transitions:\n"
        "      success: end\n"
        "      ok: end\n",
        encoding="utf-8",
    )
    return flow_id


def _write_agent_cfg(path: Path, summary: str) -> None:
    path.write_text(
        yaml.safe_dump(
            {
                "id": "codex_cli",
                "llm_enabled": False,
                "execute_commands": False,
                "mock_responses": {
                    "investigate_error": (
                        f'{{"status": "success", "summary": "{summary}", "label": "ok"}}'
                    )
                },
            }
        ),
        encoding="utf-8",
    )


def test_agent_profile_override(monkeypatch, tmp_path: Path) -> None:
    flows_dir = tmp_path / "flows"
    agents_dir = tmp_path / "agents"
    flows_dir.mkdir()
    agents_dir.mkdir()
    monkeypatch.setattr(settings, "flows_dir", flows_dir)
    monkeypatch.setattr(settings, "agents_dir", agents_dir)

    flow_id = _write_flow(flows_dir)

    default_cfg = agents_dir / "codex_cli.yaml"
    alt_cfg = agents_dir / "codex_cli_codex.yaml"
    _write_agent_cfg(default_cfg, "default-profile")
    _write_agent_cfg(alt_cfg, "codex-profile")

    # Default profile uses the base config
    session = run_flow(flow_id, {})
    assert "default-profile" in session.steps[0].result.output

    # Override to the codex profile via env var
    monkeypatch.setenv("TASKTREE_AGENT_PROFILE_CODEX_CLI", "codex_cli_codex")
    session_alt = run_flow(flow_id, {})
    assert "codex-profile" in session_alt.steps[0].result.output
