#!/usr/bin/env bash

# Ensure alerts pane renders content quickly (no blank pane at startup).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SESSION="ttx-alerts-timely-$$"

"$ROOT/scripts/tmux_dashboard.sh" --session "$SESSION" --no-attach --smoke
trap 'tmux kill-session -t "$SESSION" >/dev/null 2>&1 || true' EXIT

ALERT_LOG="$ROOT/logs/tmux/$SESSION/alerts.log"

tries=10
while [ $tries -gt 0 ] && { [ ! -s "$ALERT_LOG" ] || ! grep -q "[A-Za-z0-9]" "$ALERT_LOG" 2>/dev/null; }; do
  sleep 1
  tries=$((tries - 1))
done

if [ ! -s "$ALERT_LOG" ] || ! grep -q "[A-Za-z0-9]" "$ALERT_LOG"; then
  echo "alerts pane stayed empty or missing content after startup"
  [ -f "$ALERT_LOG" ] && cat "$ALERT_LOG" || true
  exit 1
fi

echo "ok: test_alerts_timely_render"
