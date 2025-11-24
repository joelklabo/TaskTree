import subprocess
from pathlib import Path

import pytest

from tasktree.agents.llm import BackendError, CodexCLIBackend


def test_codex_cli_backend_builds_command_with_model(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    captured: dict[str, list[str]] = {}

    def fake_run(cmd, input, cwd, env, capture_output, text, timeout, check):
        captured["cmd"] = cmd

        class Proc:
            returncode = 0
            stdout = '{"status":"success"}'
            stderr = ""

        return Proc()

    monkeypatch.setattr(subprocess, "run", fake_run)

    backend = CodexCLIBackend(command=["codex"], model="cheap-model", workdir=tmp_path)
    backend.complete("hi")

    assert captured["cmd"][:2] == ["codex", "exec"]
    assert captured["cmd"][-1] == "-"
    assert "-m" in captured["cmd"]
    m_index = captured["cmd"].index("-m")
    assert captured["cmd"][m_index + 1] == "cheap-model"


def test_codex_cli_backend_strips_code_fences(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    def fake_run(cmd, input, cwd, env, capture_output, text, timeout, check):

        class Proc:
            returncode = 0
            stdout = "```json\n{\"status\":\"success\",\"summary\":\"ok\"}\n```"
            stderr = ""

        return Proc()

    monkeypatch.setattr(subprocess, "run", fake_run)
    backend = CodexCLIBackend(command=["codex"], model=None, workdir=tmp_path)
    raw = backend.complete("prompt")
    assert raw == '{"status":"success","summary":"ok"}'


def test_codex_cli_backend_raises_on_failure(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    def fake_run(cmd, input, cwd, env, capture_output, text, timeout, check):

        class Proc:
            returncode = 1
            stdout = ""
            stderr = "boom"

        return Proc()

    monkeypatch.setattr(subprocess, "run", fake_run)
    backend = CodexCLIBackend(command=["codex"], model=None, workdir=tmp_path)
    with pytest.raises(BackendError):
        backend.complete("prompt")
