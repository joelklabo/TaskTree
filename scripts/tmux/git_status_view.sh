#!/usr/bin/env bash
set -euo pipefail
printf '\033]2;Git status\007'
echo "Git status (short)"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git status -sb
else
  echo "Not a git repo"
fi
