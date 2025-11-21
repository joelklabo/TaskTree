#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SESSION="ttx-dashcmd-$$"

"$ROOT/scripts/tmux_dashboard.sh" --session "$SESSION" --no-attach --smoke
trap 'tmux kill-session -t "$SESSION" >/dev/null 2>&1 || true' EXIT

cmd=$(tmux display-message -p -t "$SESSION:dashboard.0" '#{pane_current_command}')
if ! echo "$cmd" | grep -qi "ttx-dashboard"; then
  echo "dashboard window not running ttx-dashboard (got: $cmd)"
  exit 1
fi

LOG="$ROOT/logs/tmux/$SESSION/dashboard-status.log"
tries=10
while [ $tries -gt 0 ] && [ ! -s "$LOG" ]; do
  sleep 1
  tries=$((tries - 1))
done

if [ ! -s "$LOG" ]; then
  echo "dashboard-status.log missing or empty"
  exit 1
fi

echo "ok: test_dashboard_window_cmd"
