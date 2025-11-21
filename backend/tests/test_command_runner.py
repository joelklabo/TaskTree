from pathlib import Path

import pytest

from tasktree.agents.runner import CommandResult, CommandRunner


def test_allowlist_blocks_unlisted_command(tmp_path: Path) -> None:
    runner = CommandRunner(allowlist=["echo *"])
    with pytest.raises(PermissionError):
        runner.run("pwd")


def test_denylist_blocks_command(tmp_path: Path) -> None:
    runner = CommandRunner(denylist=["rm *"])
    with pytest.raises(PermissionError):
        runner.run("rm -rf /tmp/foo")


def test_dry_run_skips_execution(tmp_path: Path) -> None:
    runner = CommandRunner(dry_run=True, workdir=tmp_path)
    result = runner.run("echo hello")
    assert isinstance(result, CommandResult)
    assert result.skipped is True
    assert "echo hello" in result.stdout
    assert result.returncode == 0


def test_timeout_sets_flag(tmp_path: Path) -> None:
    runner = CommandRunner(timeout_sec=0.1, workdir=tmp_path)
    result = runner.run('python -c "import time; time.sleep(1)"')
    assert result.timed_out is True
    assert result.returncode != 0


def test_blocks_destructive_rm(tmp_path: Path) -> None:
    runner = CommandRunner(workdir=tmp_path)
    with pytest.raises(PermissionError):
        runner.run("rm -rf some/path")


def test_allows_simple_command(tmp_path: Path) -> None:
    runner = CommandRunner(workdir=tmp_path)
    result = runner.run("echo success")
    assert result.returncode == 0
    assert "success" in result.stdout
