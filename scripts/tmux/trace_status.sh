#!/usr/bin/env bash

# Render trace summary (latest runs) for dashboard.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STATE="${DASHBOARD_STATE:-$ROOT/tmp/dashboard_state.json}"
export STATE
printf '\033]2;Traces\007'

python3 - <<'PY'
import json, os, pathlib
state_path = pathlib.Path(os.environ.get("STATE","tmp/dashboard_state.json"))
print("TaskTree traces")
if not state_path.exists():
    print("(state missing; run collector)")
    raise SystemExit
try:
    data = json.loads(state_path.read_text())
except Exception as e:
    print(f"(state unreadable: {e})")
    raise SystemExit
traces = data.get("traces", {})
print(f"Recent runs: {traces.get('recent_runs','?')}")
PY
