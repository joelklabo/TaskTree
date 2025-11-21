#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SESSION="ttx-state-$$"
STATE="$ROOT/tmp/dashboard_state.json"

rm -f "$STATE"

"$ROOT/scripts/tmux_dashboard.sh" --session "$SESSION" --no-attach --smoke
trap 'tmux kill-session -t "$SESSION" >/dev/null 2>&1 || true' EXIT

tries=10
while [ $tries -gt 0 ] && [ ! -s "$STATE" ]; do
  sleep 1
  tries=$((tries - 1))
done

if [ ! -s "$STATE" ]; then
  echo "dashboard_state.json not created by tmux_dashboard.sh"
  exit 1
fi

# Ensure file is fresh (modified within last 30s).
now=$(date +%s)
mtime=$(stat -f %m "$STATE")
age=$((now - mtime))
if [ "$age" -gt 30 ]; then
  echo "dashboard_state.json too old ($age s)"
  exit 1
fi

echo "ok: test_dashboard_state_tmux"
