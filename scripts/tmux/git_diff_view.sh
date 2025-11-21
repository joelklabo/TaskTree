#!/usr/bin/env bash
set -euo pipefail
printf '\033]2;Git diff\007'
echo "Git diff --stat (staged + unstaged)"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git diff --stat
  echo "---"
  git diff --stat --cached || true
else
  echo "Not a git repo"
fi
