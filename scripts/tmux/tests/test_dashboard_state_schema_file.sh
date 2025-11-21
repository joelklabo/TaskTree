#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
STATE="$ROOT/tmp/dashboard_state.json"
export SCHEMA="$ROOT/scripts/tmux/dashboard_state.schema.json"

"$ROOT/scripts/tmux/dashboard_collector.sh" --once --smoke --dest "$STATE"

set +e
"$ROOT/scripts/tmux/dashboard_state_validator.py" "$STATE" "$SCHEMA"
code=$?
set -e
if [ $code -ne 0 ]; then
  echo "dashboard_state_validator failed"
  exit 1
fi
