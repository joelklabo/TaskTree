#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SESSION="ttx-tui-$$"

"$ROOT/scripts/tmux_dashboard.sh" --session "$SESSION" --no-attach --smoke
trap 'tmux kill-session -t "$SESSION" >/dev/null 2>&1 || true' EXIT

if ! tmux list-windows -t "$SESSION" -F '#{window_name} #{pane_current_command}' | grep -q "dashboard ttx-dashboard"; then
  echo "dashboard window not running ttx-dashboard"
  exit 1
fi

TUI_LOG="$ROOT/logs/tmux/$SESSION/dashboard-status.log"
tries=10
while [ $tries -gt 0 ] && [ ! -s "$TUI_LOG" ]; do
  sleep 1
  tries=$((tries - 1))
done

if [ ! -s "$TUI_LOG" ]; then
  echo "dashboard log missing or empty"
  exit 1
fi

echo "ok: test_tui_window"
