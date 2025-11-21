#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
STATE="$ROOT/tmp/dashboard_state_bad_types.json"
SCHEMA="$ROOT/scripts/tmux/dashboard_state.schema.json"

cat >"$STATE" <<'EOF'
{
  "status": { "env": 42, "ready": true, "updated_at": false },
  "git": { "branch": 99, "ahead": "1", "behind": "0", "dirty": "two" },
  "servers": [ { "name": "backend", "status": true, "port": 8000 } ],
  "alerts": { "total": "5", "recent_text": "ok", "recent": [ { "level": "info", "msg": "everything fine" } ] },
  "ci": { "status": "completed", "recent_text": "ok", "runs": [ { "workflow": "ci", "status": "completed", "conclusion": "success", "branch": "main" } ] },
  "traces": { "recent_runs": "two" },
  "logs": { "configured_sources": "many" }
}
EOF

set +e
"$ROOT/scripts/tmux/dashboard_state_validator.py" "$STATE" "$SCHEMA"
code=$?
set -e
if [ $code -eq 0 ]; then
  echo "validator passed with wrong types"
  exit 1
fi

echo "ok: test_dashboard_state_schema_types"
