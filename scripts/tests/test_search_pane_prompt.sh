#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SESSION="ttx-search-$$"

"$ROOT/scripts/tmux_dashboard.sh" --session "$SESSION" --no-attach --smoke
trap 'tmux kill-session -t "$SESSION" >/dev/null 2>&1 || true' EXIT

SEARCH_LOG="$ROOT/logs/tmux/$SESSION/search.log"

tries=6
while [ $tries -gt 0 ] && [ ! -s "$SEARCH_LOG" ]; do
  sleep 1
  tries=$((tries - 1))
done

if ! grep -q "pattern>" "$SEARCH_LOG"; then
  echo "search pane missing prompt/copy header"
  cat "$SEARCH_LOG" || true
  exit 1
fi

echo "ok: test_search_pane_prompt (expected to fail until prompt is logged)"
