#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SESSION="ttx-ci-$$"

"$ROOT/scripts/tmux_dashboard.sh" --session "$SESSION" --no-attach --smoke
trap 'tmux kill-session -t "$SESSION" >/dev/null 2>&1 || true' EXIT

CI_LOG="$ROOT/logs/tmux/$SESSION/ci.log"

tries=6
while [ $tries -gt 0 ] && [ ! -s "$CI_LOG" ]; do
  sleep 1
  tries=$((tries - 1))
done

if [ ! -s "$CI_LOG" ]; then
  echo "CI pane log missing or empty: $CI_LOG"
  exit 1
fi

if ! grep -qi "CI builds" "$CI_LOG"; then
  echo "CI log missing header/content"
  cat "$CI_LOG"
  exit 1
fi

echo "ok: test_ci_pane_missing (expected to fail until CI pane added)"
