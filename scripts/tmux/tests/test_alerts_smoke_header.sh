#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SESSION="ttx-alerts-$$"

"$ROOT/scripts/tmux_dashboard.sh" --session "$SESSION" --no-attach --smoke
trap 'tmux kill-session -t "$SESSION" >/dev/null 2>&1 || true' EXIT

ALERT_LOG="$ROOT/logs/tmux/$SESSION/alerts.log"

tries=10
until grep -q "# Alerts" "$ALERT_LOG"; do
  tries=$((tries - 1))
  if [ $tries -le 0 ]; then break; fi
  sleep 1
done

if ! grep -q "# Alerts" "$ALERT_LOG"; then
  echo "alerts pane missing header/content in smoke mode"
  cat "$ALERT_LOG" || true
  exit 1
fi

echo "ok: test_alerts_smoke_header (expected to fail until alerts pane shows header)"
