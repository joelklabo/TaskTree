#!/usr/bin/env bash

# On-demand watchdog: checks pane headers/windows/log sources and emits toast + health log on failures.

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: health_check.sh <session>"
  exit 1
fi

SESSION="$1"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_DIR="$ROOT/logs/tmux/$SESSION"
mkdir -p "$LOG_DIR"
LOG_PATH="$LOG_DIR/health.log"

fail=0
msgs=()

check_window() {
  local w="$1"
  if ! tmux list-windows -t "$SESSION" -F '#{window_name}' | grep -qx "$w"; then
    msgs+=("missing window: $w")
    fail=1
  fi
}

check_header() {
  local window="$1"
  local expect="$2"
  local pane
  pane=$(tmux list-panes -t "$SESSION:$window" -F '#{pane_id}' | head -n1 || true)
  if [ -z "$pane" ]; then
    msgs+=("no pane in $window")
    fail=1
    return
  fi
  if ! tmux capture-pane -ep -t "$pane" | grep -q "$expect"; then
    msgs+=("missing '$expect' in $window")
    fail=1
  fi
}

for w in dashboard servers logs search git alerts help shares sources; do
  check_window "$w"
done

check_header "dashboard" "TaskTree dev status"
check_header "alerts" "# Alerts"
check_header "sources" "Log sources overview"

if ! "$ROOT/scripts/log_sources_overview.sh" >/tmp/health_sources.$$ 2>/dev/null; then
  msgs+=("log_sources_overview failed")
  fail=1
else
  if ! grep -q "files:" /tmp/health_sources.$$; then
    msgs+=("log_sources_overview has no sources")
    fail=1
  fi
fi
rm -f /tmp/health_sources.$$

timestamp="$(date -Iseconds)"
if [ $fail -ne 0 ]; then
  {
    echo "[$timestamp] FAIL: ${msgs[*]}"
  } >>"$LOG_PATH"
  tmux display-message "health check FAIL: ${msgs[*]}"
else
  tmux display-message "health check OK"
fi
