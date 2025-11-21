from pathlib import Path
from typing import Any

import pytest

from tasktree.agents.llm import APIBackend, ExternalCLIBackend


class _DummyResponse:
    def __init__(self, text: str, status_code: int = 200):
        self.text = text
        self.status_code = status_code

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise RuntimeError(f"status {self.status_code}")


def test_external_cli_backend_returns_stdout(tmp_path: Path) -> None:
    script = tmp_path / "echo_prompt.py"
    script.write_text("import sys\nprint(sys.stdin.read().strip())")
    backend = ExternalCLIBackend(["python", str(script)])
    out = backend.complete("hello")
    assert "hello" in out


def test_external_cli_backend_raises_on_failure(tmp_path: Path) -> None:
    bad_script = tmp_path / "fail.py"
    bad_script.write_text("import sys; sys.exit(5)")
    backend = ExternalCLIBackend(["python", str(bad_script)])
    with pytest.raises(RuntimeError):
        backend.complete("ignored")


def test_api_backend_calls_httpx(monkeypatch: Any) -> None:
    calls: list[dict[str, Any]] = []

    def fake_post(
        url: str, json: dict[str, Any], headers: dict[str, str], timeout: float
    ) -> _DummyResponse:
        calls.append({"url": url, "json": json, "headers": headers, "timeout": timeout})
        return _DummyResponse(text="ok", status_code=200)

    monkeypatch.setattr("tasktree.agents.llm.httpx.post", fake_post)

    backend = APIBackend(
        endpoint="http://example.com",
        model="m",
        temperature=0.1,
        max_tokens=10,
        api_key_env=None,
    )
    out = backend.complete("prompt text")
    assert out == "ok"
    assert calls[0]["json"]["prompt"] == "prompt text"
