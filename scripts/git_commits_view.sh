#!/usr/bin/env bash
set -euo pipefail
printf '\033]2;Commits\007'
echo "Recent commits (git log -10 --oneline --relative-date)"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git log -10 --oneline --relative-date
else
  echo "Not a git repo"
fi
