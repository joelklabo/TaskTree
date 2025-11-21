#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
OUT="$ROOT/tmp/dashboard_state.json"

rm -f "$OUT"

"$ROOT/scripts/tmux/dashboard_collector.sh" --once --smoke --dest "$OUT"

if [ ! -s "$OUT" ]; then
  echo "dashboard state file missing or empty: $OUT"
  exit 1
fi

required=(status git servers alerts ci traces logs)
missing=0
for key in "${required[@]}"; do
  if ! grep -q "\"$key\"" "$OUT"; then
    echo "missing key in dashboard state: $key"
    missing=1
  fi
done

if [ $missing -ne 0 ]; then
  exit 1
fi

echo "ok: test_dashboard_state_smoke"
