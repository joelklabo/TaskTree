#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
STATE="$ROOT/tmp/dashboard_state.json"
CACHE="$ROOT/logs/tmux/cache/state.json"

rm -f "$STATE" "$CACHE"

# Seed a state.
"$ROOT/scripts/tmux/dashboard_collector.sh" --once --smoke --dest "$STATE"
seed_hash=$(sha1sum "$STATE" | awk '{print $1}')

# Simulate failure; collector should fall back to cache (same hash).
env DASH_SIMULATE_FAIL=1 "$ROOT/scripts/tmux/dashboard_collector.sh" --once --dest "$STATE" || true

if [ ! -s "$STATE" ]; then
  echo "state missing after simulated failure"
  exit 1
fi
new_hash=$(sha1sum "$STATE" | awk '{print $1}')
if [ "$seed_hash" != "$new_hash" ]; then
  echo "state changed after failure (expected cache fallback)"
  exit 1
fi

echo "ok: test_dashboard_state_cache"
