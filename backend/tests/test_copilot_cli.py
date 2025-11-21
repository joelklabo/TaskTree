import json
from pathlib import Path

import pytest

from tasktree.agents.base import AgentContext
from tasktree.agents.copilot_cli import CopilotCLIAgent, CopilotConfig


def _ctx() -> AgentContext:
    return AgentContext(
        session_id="s1",
        flow_name="flow",
        flow_version="1.0.0",
        step_name="plan",
        input={"input": {"bug_description": "example"}},
        strategies=[],
    )


def test_copilot_uses_mock_response(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    mock_resp = json.dumps(
        {
            "status": "success",
            "summary": "ok",
            "learnings": ["note"],
            "commands": [],
        }
    )

    cfg = CopilotConfig.from_dict(
        {
            "id": "copilot_cli",
            "prompt_dir": tmp_path,
            "mock_responses": {"plan_bugfix": mock_resp},
        }
    )

    (Path(cfg.prompt_dir) / "code_plan.j2").write_text("prompt")
    agent = CopilotCLIAgent(cfg.__dict__)

    out = agent.run_step("plan_bugfix", _ctx())

    assert out.result.status.value == "success"
    assert "ok" in out.result.output
    assert out.result.learnings == ["note"]


def test_copilot_executes_commands_when_enabled(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    mock_resp = json.dumps(
        {
            "status": "success",
            "summary": "ran",
            "commands": ["echo hi"],
            "learnings": [],
        }
    )
    cfg = CopilotConfig.from_dict(
        {
            "prompt_dir": tmp_path,
            "mock_responses": {"implement_fix": mock_resp},
            "execute_commands": True,
            "root": tmp_path,
        }
    )
    (Path(cfg.prompt_dir) / "code_impl.j2").write_text("prompt")
    agent = CopilotCLIAgent(cfg.__dict__)
    out = agent.run_step("implement_fix", _ctx())

    assert "echo hi" in out.result.output
    assert out.result.status.value == "success"


def test_missing_prompt_raises(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    cfg = CopilotConfig.from_dict({"prompt_dir": tmp_path})
    agent = CopilotCLIAgent(cfg.__dict__)

    with pytest.raises(FileNotFoundError):
        agent.run_step("plan_bugfix", _ctx())


def test_llm_enabled_requires_endpoint(tmp_path: Path) -> None:
    cfg = CopilotConfig.from_dict({"prompt_dir": tmp_path, "llm_enabled": True})
    (Path(cfg.prompt_dir) / "code_plan.j2").write_text("prompt")
    agent = CopilotCLIAgent(cfg.__dict__)
    with pytest.raises(RuntimeError):
        agent.run_step("plan_bugfix", _ctx())
