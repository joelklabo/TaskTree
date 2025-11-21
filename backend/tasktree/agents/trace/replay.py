import json
import os
import subprocess  # nosec B404
import sys
from pathlib import Path


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python -m tasktree.agents.trace.replay <RUN_ID> [--dry-run]")
        sys.exit(1)

    run_id = sys.argv[1]
    dry_run = "--dry-run" in sys.argv

    root = (Path(__file__).parent / "runs" / run_id).resolve()
    meta_path = root / "meta.json"

    if not meta_path.exists():
        print(f"No meta.json found for run '{run_id}' at {meta_path}")
        sys.exit(1)

    meta = json.loads(meta_path.read_text())
    cmd = meta["cmd"]
    cwd = meta["cwd"]

    print(f"Replay run: {run_id}")
    print(f"cwd: {cwd}")
    print(f"cmd: {' '.join(cmd)}")

    if dry_run:
        print("(dry run only)")
        return

    os.environ["TASKTREE_RUN_ID"] = run_id
    os.environ["TASKTREE_TRACE_ROOT"] = str(root)

    os.chdir(cwd)
    subprocess.run(cmd)  # nosec B603


if __name__ == "__main__":
    main()
