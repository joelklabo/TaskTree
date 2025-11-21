from __future__ import annotations

import os
import subprocess  # nosec B404
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path

import httpx


class BackendError(RuntimeError):
    pass


@dataclass
class APIBackend:
    endpoint: str
    model: str
    temperature: float
    max_tokens: int
    api_key_env: str | None = None
    timeout_sec: float = 30.0

    def complete(self, prompt: str) -> str:
        headers: dict[str, str] = {"Content-Type": "application/json"}
        if self.api_key_env:
            maybe_key = os.environ.get(self.api_key_env)
            if maybe_key:
                headers["Authorization"] = f"Bearer {maybe_key}"

        payload = {
            "model": self.model,
            "prompt": prompt,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
        }
        try:
            resp = httpx.post(
                self.endpoint, json=payload, headers=headers, timeout=self.timeout_sec
            )
            resp.raise_for_status()
            return resp.text
        except Exception as exc:
            raise BackendError(f"API backend failed: {exc}") from exc


@dataclass
class ExternalCLIBackend:
    command: Sequence[str]
    env: Mapping[str, str] | None = None
    workdir: Path | None = None
    timeout_sec: float | None = 60.0

    def complete(self, prompt: str) -> str:
        try:
            proc = subprocess.run(  # nosec B603
                list(self.command),
                input=prompt,
                cwd=self.workdir,
                env=None if self.env is None else {**os.environ, **self.env},
                capture_output=True,
                text=True,
                timeout=self.timeout_sec,
                check=False,
            )
        except subprocess.TimeoutExpired as exc:
            raise BackendError("CLI backend timed out") from exc
        except Exception as exc:  # pragma: no cover - defensive
            raise BackendError(f"CLI backend failed to start: {exc}") from exc

        if proc.returncode != 0:
            raise BackendError(f"CLI backend exited {proc.returncode}: {proc.stderr.strip()}")

        return proc.stdout
