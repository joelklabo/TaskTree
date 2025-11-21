#!/usr/bin/env bash
set -euo pipefail

LOCK_FILE=".git/context-runner.lock"

if [ $# -lt 1 ]; then
  echo "usage: scripts/runner.sh \"commit message\""
  exit 1
fi

if command -v flock >/dev/null 2>&1; then
  (
    flock -n 9 || {
      echo "Another agent is committing, retry later."
      exit 1
    }

    git fetch origin || true
    git rebase "origin/$(git rev-parse --abbrev-ref HEAD)" || true

    make ci

    git add -A
    git commit -m "$1"
    git push origin HEAD

  ) 9>"${LOCK_FILE}"
  exit 0
fi

python3 - "$LOCK_FILE" "$1" <<'PY'
import fcntl
import os
import subprocess
import sys

lock_path, message = sys.argv[1], sys.argv[2]
fd = os.open(lock_path, os.O_RDWR | os.O_CREAT, 0o600)

try:
    fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
except OSError:
    print("Another agent is committing, retry later.")
    sys.exit(1)

def run(cmd, allow_fail=False):
    result = subprocess.run(cmd)
    if result.returncode != 0 and not allow_fail:
        sys.exit(result.returncode)

branch = subprocess.check_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]).decode().strip()

run(["git", "fetch", "origin"], allow_fail=True)
run(["git", "rebase", f"origin/{branch}"], allow_fail=True)
run(["make", "ci"])
run(["git", "add", "-A"])
run(["git", "commit", "-m", message])
run(["git", "push", "origin", "HEAD"])
PY
