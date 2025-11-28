import subprocess
import sys
from pathlib import Path


def test_feature_to_beads_dry_run(tmp_path: Path) -> None:
    repo_root = Path(__file__).resolve().parents[2]
    script = repo_root / "scripts" / "feature_to_beads.py"

    spec = tmp_path / "spec.md"
    spec.write_text("Add dark-mode toggle on dashboard")

    result = subprocess.run(
        [
            sys.executable,
            str(script),
            "--title",
            "Dark mode toggle",
            "--description-file",
            str(spec),
            "--tasks",
            "Research,Implementation,Testing",
            "--priority",
            "3",
        ],
        capture_output=True,
        text=True,
        check=True,
    )

    stdout = result.stdout
    assert "Dry-run" in stdout
    assert "Epic: Dark mode toggle" in stdout
    assert "Task 1: Research" in stdout
    assert "Retry Log (min 3 attempts" in stdout
