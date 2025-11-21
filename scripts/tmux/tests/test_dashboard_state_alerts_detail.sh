#!/usr/bin/env bash

# Alerts section should expose recent structured entries (level/msg/source), not just a count.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

SESSION="alerts-detail-$$"
LOGDIR="$ROOT/logs/tmux/$SESSION"
mkdir -p "$LOGDIR"
ALERT_LOG="$LOGDIR/alerts.log"

cat >"$ALERT_LOG" <<'EOF'
# Alerts (errors/warnings)
- sources: logs/
Recent hit: CRITICAL failure at backend/api.py:123
EOF

STATE="$TMPDIR/state.json"

SESSION="$SESSION" "$ROOT/scripts/tmux/dashboard_collector.sh" --once --dest "$STATE" || true

if ! jq -e '.alerts.recent | length >= 1' "$STATE" >/dev/null 2>&1; then
  echo "alerts.recent missing structured entries"
  cat "$STATE" || true
  exit 1
fi

msg="$(jq -r '.alerts.recent[0].msg' "$STATE")"
level="$(jq -r '.alerts.recent[0].level' "$STATE")"

if [ -z "$msg" ] || [ "$msg" = "null" ]; then
  echo "alerts.recent.msg empty"
  jq '.alerts' "$STATE"
  exit 1
fi

if [ "$level" = "null" ] || [ -z "$level" ]; then
  echo "alerts.recent.level missing"
  jq '.alerts' "$STATE"
  exit 1
fi

echo "ok: test_dashboard_state_alerts_detail (expected to fail until structured alerts added)"
