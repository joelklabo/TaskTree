#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SESSION="ttx-alert-cache-$$"

# First run to seed cache.
LOG_SOURCES_FILE="$ROOT/logs/log_sources.yaml" "$ROOT/scripts/tmux_dashboard.sh" --session "$SESSION" --no-attach --smoke
trap 'tmux kill-session -t "$SESSION" >/dev/null 2>&1 || true' EXIT
ALERT_LOG="$ROOT/logs/tmux/$SESSION/alerts.log"
CACHE_FILE="$ROOT/logs/tmux/cache/alerts.out"

tries=6
while [ $tries -gt 0 ] && [ ! -s "$ALERT_LOG" ]; do
  sleep 1
  tries=$((tries - 1))
done

# Ensure cache exists.
if [ ! -s "$CACHE_FILE" ]; then
  echo "cache file not created: $CACHE_FILE"
  exit 1
fi

# Simulate failure by calling cache wrapper with PATH stripped so alerts would fail; expect cached output to be used.
env -i PATH="/usr/bin:/bin" "$ROOT/scripts/cache_wrapper.sh" alerts false >/tmp/alert_cache_test.log || true

if ! grep -q "(cached" /tmp/alert_cache_test.log; then
  echo "alerts cache fallback not used when command fails"
  exit 1
fi

echo "ok: test_alerts_cache_fallback"
