#!/usr/bin/env bash

# Deterministic tmux e2e check for the TaskTree dashboard.
#
# Steps:
# 1) Spin a temp session in smoke mode.
# 2) Assert required windows/panes exist.
# 3) Trigger Prefix+R (refresh) and Prefix+C (capture) in target panes.
# 4) Validate pane content via pipe logs.
# 5) Verify a capture file was created.
# 6) Clean up and exit nonzero on failure.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPTS="$ROOT/scripts/tmux"
SESSION="ttx-e2e-$$"
TMUX_LOG_DIR="$ROOT/logs/tmux/$SESSION"
mkdir -p "$TMUX_LOG_DIR"

fail() {
  echo "E2E FAIL: $*" >&2
  tmux kill-session -t "$SESSION" 2>/dev/null || true
  exit 1
}

cleanup() {
  tmux kill-session -t "$SESSION" 2>/dev/null || true
}
trap cleanup EXIT

# Start the dashboard in smoke mode (no servers).
"$SCRIPTS/tmux_dashboard.sh" --session "$SESSION" --no-attach --smoke

# Helper: wait for a window to appear.
wait_window() {
  local name="$1" tries=20
  until tmux list-windows -t "$SESSION" -F '#{window_name}' | grep -qx "$name"; do
    tries=$((tries - 1))
    [ $tries -le 0 ] && fail "window '$name' not found"
    sleep 0.2
  done
}

for w in dashboard servers logs search git alerts help shares sources; do
  wait_window "$w"
done

# Debug snapshot of windows/panes.
tmux list-windows -t "$SESSION" >"$TMUX_LOG_DIR/windows.txt"
for w in dashboard servers logs search git alerts help shares sources; do
  tmux list-panes -t "$SESSION:$w" -F '#{pane_index} #{pane_id}' >>"$TMUX_LOG_DIR/panes.txt" || true
done

# Confirm keybindings are present (prefix table).
if ! tmux list-keys -T prefix | grep -q "refresh_tmux_dashboard.sh"; then
  fail "refresh binding missing"
fi
if ! tmux list-keys -T prefix | grep -q "share_pane.sh"; then
  fail "capture binding missing"
fi

# Trigger Prefix+R (refresh) targeting the status pane (first pane in dashboard).
DB_PANES=()
while IFS= read -r p; do DB_PANES+=("$p"); done < <(tmux list-panes -t "$SESSION:dashboard" -F '#{pane_id}')
# shellcheck disable=SC2034  # Present for readability / future assertions.
STATUS_PANE="${DB_PANES[0]:-}"
# shellcheck disable=SC2034  # Present for readability / future assertions.
PLAN_PANE="${DB_PANES[1]:-}"
# shellcheck disable=SC2034  # Present for readability / future assertions.
TRACES_PANE="${DB_PANES[2]:-}"
LOGS_PANE="${DB_PANES[3]:-}"

# Run the refresh script as the binding would.
if ! "$SCRIPTS/refresh_tmux_dashboard.sh" --session "$SESSION" >/tmp/ttx-e2e-refresh.log 2>&1; then
  fail "refresh script failed (see /tmp/ttx-e2e-refresh.log)"
fi
sleep 2

# Trigger capture (share_pane) in dashboard logs pane.
get_pane_field() {
  local pane="$1" fmt="$2"
  tmux display-message -p -t "$pane" "$fmt"
}
SHARE_DIR="$ROOT/logs/pane_shares"
mkdir -p "$SHARE_DIR"
BEFORE_COUNT=$(find "$SHARE_DIR" -type f 2>/dev/null | wc -l | tr -d ' ')
LOG_PANE_INDEX=$(get_pane_field "$LOGS_PANE" '#{pane_index}')
LOG_PANE_TITLE=$(get_pane_field "$LOGS_PANE" '#{pane_title}')
LOG_PANE_CMD=$(get_pane_field "$LOGS_PANE" '#{pane_current_command}')
LOG_PANE_PID=$(get_pane_field "$LOGS_PANE" '#{pane_pid}')
LOG_PANE_PATH=$(get_pane_field "$LOGS_PANE" '#{pane_current_path}')
if ! "$SCRIPTS/share_pane.sh" "$SESSION" "dashboard" "$LOG_PANE_INDEX" "$LOG_PANE_TITLE" "$LOG_PANE_CMD" "$LOG_PANE_PID" "$LOG_PANE_PATH" >/tmp/ttx-e2e-share.log 2>&1; then
  fail "share_pane failed (see /tmp/ttx-e2e-share.log)"
fi
sleep 2

# Validate via pane logs to avoid target lookup flakiness.
# Give panes a moment to emit text to their pipes.
sleep 2
require_log() {
  local file="$1"
  local needle="$2"
  if [ ! -f "$file" ]; then
    fail "log missing: $file"
  fi
  if ! grep -q "$needle" "$file"; then
    fail "log $file missing '$needle'"
  fi
}

require_log "$TMUX_LOG_DIR/dashboard-status.log" "TaskTree dev status"
require_log "$TMUX_LOG_DIR/dashboard-plan.log" "TaskTree flows"
require_log "$TMUX_LOG_DIR/dashboard-traces.log" "TaskTree traces"
# For alerts/sources/shares, just ensure the pipes exist (content may vary if log_alerts/log_sources are empty).
[ -f "$TMUX_LOG_DIR/alerts.log" ] || fail "log missing: $TMUX_LOG_DIR/alerts.log"
[ -f "$TMUX_LOG_DIR/sources.log" ] || fail "log missing: $TMUX_LOG_DIR/sources.log"
[ -f "$TMUX_LOG_DIR/shares.log" ] || fail "log missing: $TMUX_LOG_DIR/shares.log"

# Verify a capture file exists.
AFTER_COUNT=$(find "$SHARE_DIR" -type f 2>/dev/null | wc -l | tr -d ' ')
if [ "$AFTER_COUNT" -le "$BEFORE_COUNT" ]; then
  fail "no capture created in logs/pane_shares (before=$BEFORE_COUNT after=$AFTER_COUNT)"
fi

echo "E2E PASS"
