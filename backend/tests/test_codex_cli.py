import json
from pathlib import Path

import pytest

from tasktree.agents import llm
from tasktree.agents.base import AgentContext
from tasktree.agents.codex_cli import CodexCLIAgent, CodexConfig
from tasktree.core.state import StepStatus


def _ctx(extra_input: dict | None = None) -> AgentContext:
    base_input = {"input": {"bug_description": "example"}}
    if extra_input:
        base_input.update(extra_input)
    return AgentContext(
        session_id="s1",
        flow_name="flow",
        flow_version="1.0.0",
        step_name="plan",
        input=base_input,
        strategies=[],
    )


def test_codex_uses_mock_response(tmp_path: Path) -> None:
    mock_resp = json.dumps(
        {
            "status": "success",
            "summary": "ok",
            "learnings": ["note"],
            "commands": [],
        }
    )

    cfg = CodexConfig.from_dict(
        {
            "id": "codex_cli",
            "prompt_dir": tmp_path,
            "llm_enabled": False,
            "mock_responses": {"plan_bugfix": mock_resp},
        }
    )

    (Path(cfg.prompt_dir) / "code_plan.j2").write_text("prompt", encoding="utf-8")
    agent = CodexCLIAgent(cfg.__dict__)

    out = agent.run_step("plan_bugfix", _ctx())

    assert out.result.status.value == "success"
    assert "ok" in out.result.output
    assert out.result.learnings == ["note"]


def test_codex_executes_commands_when_enabled(tmp_path: Path) -> None:
    mock_resp = json.dumps(
        {
            "status": "success",
            "summary": "ran",
            "commands": ["echo hi"],
            "learnings": [],
        }
    )
    cfg = CodexConfig.from_dict(
        {
            "prompt_dir": tmp_path,
            "llm_enabled": False,
            "mock_responses": {"implement_fix": mock_resp},
            "execute_commands": True,
            "root": tmp_path,
        }
    )
    (Path(cfg.prompt_dir) / "code_impl.j2").write_text("prompt", encoding="utf-8")
    agent = CodexCLIAgent(cfg.__dict__)
    out = agent.run_step("implement_fix", _ctx())

    assert "echo hi" in out.result.output
    assert out.result.status.value == "success"


def test_missing_prompt_raises(tmp_path: Path) -> None:
    cfg = CodexConfig.from_dict({"prompt_dir": tmp_path, "llm_enabled": False})
    agent = CodexCLIAgent(cfg.__dict__)

    # Should return failure result instead of raising
    out = agent.run_step("plan_bugfix", _ctx())
    assert out.result.status == StepStatus.FAILURE
    assert "Prompt template 'code_plan.j2' not found" in out.result.output


def test_codex_cli_model_override_from_context(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    mock_resp = json.dumps(
        {
            "status": "success",
            "summary": "ok",
            "commands": [],
            "learnings": [],
        }
    )
    cfg = CodexConfig.from_dict(
        {
            "prompt_dir": tmp_path,
            "llm_enabled": True,
            "backend_type": "codex_cli",
            "model": "gpt-default",
        }
    )
    (Path(cfg.prompt_dir) / "code_plan.j2").write_text("prompt", encoding="utf-8")
    agent = CodexCLIAgent(cfg.__dict__)

    observed: dict[str, str] = {}

    def fake_complete(self: llm.CodexCLIBackend, prompt: str) -> str:
        observed["model"] = self.model
        return mock_resp

    monkeypatch.setattr(llm.CodexCLIBackend, "complete", fake_complete)

    ctx = _ctx({"llm_model": "gpt-cheap"})
    out = agent.run_step("plan_bugfix", ctx)

    assert observed["model"] == "gpt-cheap"
    assert out.result.status.value == "success"


def test_codex_logs_config_when_tracing(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    mock_resp = json.dumps(
        {
            "status": "success",
            "summary": "ok",
            "commands": [],
            "learnings": [],
        }
    )
    cfg = CodexConfig.from_dict(
        {
            "prompt_dir": tmp_path,
            "llm_enabled": False,
            "mock_responses": {"plan_bugfix": mock_resp},
        }
    )
    (Path(cfg.prompt_dir) / "code_plan.j2").write_text("prompt", encoding="utf-8")
    agent = CodexCLIAgent(cfg.__dict__)

    trace_root = tmp_path / "traces"
    monkeypatch.setenv("TASKTREE_TRACE_ROOT", str(trace_root))
    monkeypatch.setenv("TASKTREE_RUN_ID", "run-123")

    agent.run_step("plan_bugfix", _ctx())

    artifact = trace_root / "run-123" / "artifacts" / "plan" / "plan_bugfix.json"
    assert artifact.exists()
    data = json.loads(artifact.read_text())
    assert "config" in data
    assert data["config"]["id"] == "codex_cli"
    assert data["config"]["model"] == cfg.model
