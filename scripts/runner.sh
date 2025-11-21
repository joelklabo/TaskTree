#!/usr/bin/env bash
# TaskTree commit helper: serialize commits, run tests, and push.
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "usage: scripts/runner.sh \"commit message\""
  exit 1
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
LOCK_FILE="${REPO_ROOT}/.git/tasktree-runner.lock"
TARGET="${RUNNER_TARGET:-test}" # default target: make test

run_pipeline() {
  local message="$1"

  git fetch origin || true
  local branch
  branch="$(git rev-parse --abbrev-ref HEAD)"
  git rebase "origin/${branch}" || true

  echo "[runner] running make ${TARGET}..."
  make "${TARGET}"

  git add -A
  git commit -m "${message}"
  git push origin HEAD
}

if command -v flock >/dev/null 2>&1; then
  (
    flock -n 9 || {
      echo "Another agent is committing, retry later."
      exit 1
    }
    run_pipeline "$1"
  ) 9>"${LOCK_FILE}"
  exit 0
fi

# Fallback for systems without flock.
python3 - "$LOCK_FILE" "$1" "$TARGET" <<'PY'
import fcntl
import os
import subprocess
import sys

lock_path, message, target = sys.argv[1], sys.argv[2], sys.argv[3]
fd = os.open(lock_path, os.O_RDWR | os.O_CREAT, 0o600)

try:
    fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
except OSError:
    print("Another agent is committing, retry later.")
    sys.exit(1)


def run(cmd, allow_fail=False) -> None:
    result = subprocess.run(cmd)
    if result.returncode != 0 and not allow_fail:
        sys.exit(result.returncode)


branch = (
    subprocess.check_output(["git", "rev-parse", "--abbrev-ref", "HEAD"])
    .decode()
    .strip()
)

run(["git", "fetch", "origin"], allow_fail=True)
run(["git", "rebase", f"origin/{branch}"], allow_fail=True)
print(f"[runner] running make {target}...")
run(["make", target])
run(["git", "add", "-A"])
run(["git", "commit", "-m", message])
run(["git", "push", "origin", "HEAD"])
PY
