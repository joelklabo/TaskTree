#!/usr/bin/env bash

# Headless smoke check for the tmux dashboard layout/logging.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SESSION="ttx-smoke-$$"
SUMMARY_DIR="$ROOT/logs/tmux/$SESSION"

echo "Starting smoke session: $SESSION"
./scripts/tmux_dashboard.sh --session "$SESSION" --no-attach --smoke

# Give panes a moment to write something.
sleep 2

mkdir -p "$SUMMARY_DIR"
tmux list-windows -t "$SESSION" >"$SUMMARY_DIR/windows.txt"
tmux list-panes -t "$SESSION" -F '#{session_name}:#{window_name}:#{pane_index}:#{pane_title}:#{pane_pid}' >"$SUMMARY_DIR/panes.txt"

echo "Windows:"
cat "$SUMMARY_DIR/windows.txt"
echo
echo "Panes:"
cat "$SUMMARY_DIR/panes.txt"

echo
echo "Log files created under $SUMMARY_DIR:"
find "$SUMMARY_DIR" -maxdepth 1 -type f -print

tmux kill-session -t "$SESSION"
echo "Smoke session complete and cleaned up."
