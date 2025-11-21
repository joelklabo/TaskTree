#!/usr/bin/env bash

# Headless smoke to ensure refresh_tmux_dashboard.sh works with an existing session.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SESSION="ttx-refresh-$$"
SUMMARY_DIR="$ROOT/logs/tmux/$SESSION"

echo "Starting refresh smoke session: $SESSION"
"$ROOT/scripts/tmux_dashboard.sh" --session "$SESSION" --no-attach --smoke

# Give it a moment to settle.
sleep 4

echo "Running refresh script..."
"$ROOT/scripts/refresh_tmux_dashboard.sh" --session "$SESSION"

mkdir -p "$SUMMARY_DIR"
tmux list-windows -t "$SESSION" >"$SUMMARY_DIR/windows.txt"
tmux list-panes -t "$SESSION" -F '#{session_name}:#{window_name}:#{pane_index}:#{pane_title}:#{pane_pid}' >"$SUMMARY_DIR/panes.txt"

echo "Windows:"
cat "$SUMMARY_DIR/windows.txt"

# Basic assertions: git window present, dashboard window present, help window present
if ! grep -q "git" "$SUMMARY_DIR/windows.txt"; then
  echo "WARN: git window not detected in windows list" >&2
fi
if ! grep -q "dashboard" "$SUMMARY_DIR/windows.txt"; then
  echo "ERROR: dashboard window missing after refresh" >&2
  tmux kill-session -t "$SESSION"
  exit 1
fi
if ! grep -q "help" "$SUMMARY_DIR/windows.txt"; then
  echo "WARN: help window not detected in windows list" >&2
fi
if ! grep -q "alerts" "$SUMMARY_DIR/windows.txt"; then
  echo "WARN: alerts window not detected in windows list" >&2
fi

echo "Killing session $SESSION"
tmux kill-session -t "$SESSION"
echo "Refresh smoke complete."
