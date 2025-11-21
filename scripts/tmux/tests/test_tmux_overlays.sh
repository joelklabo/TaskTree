#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SESSION="ttx-overlay-$$"

"$ROOT/scripts/tmux_dashboard.sh" --session "$SESSION" --no-attach --smoke
trap 'tmux kill-session -t "$SESSION" >/dev/null 2>&1 || true' EXIT

tmux list-windows -t "$SESSION" >/dev/null

STATUS_LOG="$ROOT/logs/tmux/$SESSION/dashboard-status.log"
SEARCH_LOG="$ROOT/logs/tmux/$SESSION/search.log"

sleep 1

for f in "$STATUS_LOG" "$SEARCH_LOG"; do
  tries=5
  while [ $tries -gt 0 ] && [ ! -s "$f" ]; do
    sleep 1
    tries=$((tries - 1))
  done
  if [ ! -s "$f" ]; then
    echo "missing pane log: $f"
    exit 1
  fi
done

if ! grep -q "Prefix+C" "$STATUS_LOG" || ! grep -q "Prefix+y" "$STATUS_LOG"; then
  echo "status pane missing capture shortcut overlay"
  exit 1
fi

grep -q "Prefix+T" "$STATUS_LOG" || {
  echo "status pane missing toast hint"
  exit 1
}

grep -q "Copy pane" "$SEARCH_LOG" || {
  echo "search pane missing copy hint"
  exit 1
}

grep -q "tmux attach -t" "$STATUS_LOG" || {
  echo "status pane missing attach hint"
  exit 1
}

echo "ok: test_tmux_overlays (expected to fail until overlays/hints added)"
