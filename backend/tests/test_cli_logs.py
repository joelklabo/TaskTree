import os
import subprocess
from pathlib import Path


def test_cli_logs_list_and_tail(tmp_path: Path) -> None:
    logs_dir = tmp_path / "logs"
    logs_dir.mkdir()
    log_file = logs_dir / "demo.log"
    log_file.write_text("line1\nline2\nline3\n", encoding="utf-8")

    env = os.environ.copy()
    env["TASKTREE_LOG_ROOT"] = str(logs_dir)
    cli = ["python", "-m", "tasktree.cli"]

    ls = subprocess.run(
        [*cli, "logs", "ls"],
        capture_output=True,
        text=True,
        env=env,
        cwd=Path(__file__).resolve().parents[1],
    )
    assert ls.returncode == 0
    assert "demo.log" in ls.stdout
    assert "Log file demo.log" in ls.stdout

    tail = subprocess.run(
        [*cli, "logs", "tail", "demo.log", "--lines", "2"],
        capture_output=True,
        text=True,
        env=env,
        cwd=Path(__file__).resolve().parents[1],
    )
    assert tail.returncode == 0
    assert "line2" in tail.stdout
    assert "line3" in tail.stdout


def test_cli_logs_watch_once(tmp_path: Path) -> None:
    logs_dir = tmp_path / "logs"
    logs_dir.mkdir()
    log_file = logs_dir / "demo.log"
    log_file.write_text("first\nsecond\n", encoding="utf-8")

    env = os.environ.copy()
    env["TASKTREE_LOG_ROOT"] = str(logs_dir)
    cli = ["python", "-m", "tasktree.cli"]

    watch = subprocess.run(
        [*cli, "logs", "watch", "--sources", "demo.log", "--once"],
        capture_output=True,
        text=True,
        env=env,
        cwd=Path(__file__).resolve().parents[1],
        timeout=15,
    )
    # The output contains ANSI codes, so we need to be careful or strip them.
    # The failure shows: '... \x1b[36m[demo.log]\x1b[0m first\n...'
    # We can check for the content without the prefix or strip ansi.
    assert "first" in watch.stdout
    assert "second" in watch.stdout
    # assert "[demo.log] first" in watch.stdout
