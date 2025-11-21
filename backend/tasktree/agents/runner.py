from __future__ import annotations

import fnmatch
import shlex
import subprocess  # nosec B404
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path


@dataclass
class CommandResult:
    command: str
    returncode: int
    stdout: str
    stderr: str
    timed_out: bool = False
    skipped: bool = False


class CommandRunner:
    """
    Shared command executor with light guardrails (allow/deny, destructive checks,
    dry-run, timeouts). Intended to wrap agent-suggested shell commands.
    """

    def __init__(
        self,
        *,
        allowlist: Iterable[str] | None = None,
        denylist: Iterable[str] | None = None,
        timeout_sec: float | None = None,
        dry_run: bool = False,
        workdir: Path | None = None,
        block_destructive: bool = True,
    ):
        self.allowlist = list(allowlist or [])
        self.denylist = list(denylist or [])
        self.timeout_sec = timeout_sec
        self.dry_run = dry_run
        self.workdir = workdir
        self.block_destructive = block_destructive

    def run(self, command: str) -> CommandResult:
        cmd_str = command.strip()
        tokens = self._split_tokens(cmd_str)

        self._enforce_allow_deny(cmd_str)
        if self.block_destructive and self._is_destructive(tokens):
            raise PermissionError(f"Command blocked as destructive: {cmd_str}")

        if self.dry_run:
            return CommandResult(
                command=cmd_str,
                returncode=0,
                stdout=f"[dry-run] {cmd_str}",
                stderr="",
                timed_out=False,
                skipped=True,
            )

        try:
            completed = subprocess.run(  # nosec B602
                cmd_str,
                shell=True,
                cwd=self.workdir,
                capture_output=True,
                text=True,
                timeout=self.timeout_sec,
                check=False,
            )
            if isinstance(completed.stdout, bytes):
                stdout_text: str = completed.stdout.decode()
            elif completed.stdout is None:
                stdout_text = ""
            else:
                stdout_text = completed.stdout

            if isinstance(completed.stderr, bytes):
                stderr_text: str = completed.stderr.decode()
            elif completed.stderr is None:
                stderr_text = ""
            else:
                stderr_text = completed.stderr

            return CommandResult(
                command=cmd_str,
                returncode=completed.returncode,
                stdout=stdout_text,
                stderr=stderr_text,
                timed_out=False,
                skipped=False,
            )
        except subprocess.TimeoutExpired as exc:
            if isinstance(exc.stdout, bytes):
                stdout = exc.stdout.decode()
            elif exc.stdout is None:
                stdout = ""
            else:
                stdout = exc.stdout

            if isinstance(exc.stderr, bytes):
                stderr = exc.stderr.decode()
            elif exc.stderr is None:
                stderr = ""
            else:
                stderr = exc.stderr
            return CommandResult(
                command=cmd_str,
                returncode=124,
                stdout=stdout,
                stderr=stderr,
                timed_out=True,
                skipped=False,
            )

    def _enforce_allow_deny(self, cmd_str: str) -> None:
        if self.denylist and any(fnmatch.fnmatch(cmd_str, pattern) for pattern in self.denylist):
            raise PermissionError(f"Command denied by policy: {cmd_str}")
        if self.allowlist and not any(
            fnmatch.fnmatch(cmd_str, pattern) for pattern in self.allowlist
        ):
            raise PermissionError(f"Command not in allowlist: {cmd_str}")

    def _is_destructive(self, tokens: list[str]) -> bool:
        if not tokens:
            return False
        head = tokens[0]
        if head == "rm":
            return True
        if head == "find" and "-delete" in tokens:
            return True
        if head == "git" and len(tokens) > 1 and tokens[1] == "rm":
            return True
        return False

    def _split_tokens(self, cmd_str: str) -> list[str]:
        try:
            return shlex.split(cmd_str)
        except ValueError:
            return []
