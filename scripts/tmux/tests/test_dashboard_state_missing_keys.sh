#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
STATE="$ROOT/tmp/dashboard_state_missing.json"
SCHEMA="$ROOT/scripts/tmux/dashboard_state.schema.json"

cat >"$STATE" <<'EOF'
{
  "status": {}
}
EOF

set +e
"$ROOT/scripts/tmux/dashboard_state_validator.py" "$STATE" "$SCHEMA"
code=$?
set -e
if [ $code -eq 0 ]; then
  echo "validator unexpectedly passed with missing keys"
  exit 1
fi

echo "ok: test_dashboard_state_missing_keys (expected fail until validator enforces schema)"
