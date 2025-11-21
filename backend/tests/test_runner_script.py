import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
RUNNER = REPO_ROOT / "scripts" / "runner.sh"


def test_runner_script_exists_and_is_executable() -> None:
    assert RUNNER.exists(), "scripts/runner.sh missing"
    assert os.access(RUNNER, os.X_OK), "scripts/runner.sh should be executable"


def test_runner_script_runs_ci_before_commit() -> None:
    content = RUNNER.read_text()
    assert "make ci" in content, "runner should run make ci before committing"
    assert "context-runner.lock" in content, "runner should serialize commits with context lock"
    assert "git commit" in content, "runner should perform git commit"
