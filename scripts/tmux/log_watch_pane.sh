#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SESSION="${TMUX_SESSION:-ttx}"
CMD="${CMD_OVERRIDE:-make log-watch}"

if ! command -v tmux >/dev/null 2>&1; then
  echo "tmux is required for this helper" >&2
  exit 1
fi

# Ensure session exists.
if ! tmux has-session -t "$SESSION" 2>/dev/null; then
  tmux new-session -d -s "$SESSION" -c "$ROOT"
fi

tmux new-window -t "$SESSION" -n log-watch -c "$ROOT" "$CMD"
echo "Opened tmux session '$SESSION' window 'log-watch' running: $CMD (cwd: $ROOT)"
