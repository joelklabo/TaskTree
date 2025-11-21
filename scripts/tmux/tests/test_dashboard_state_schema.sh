#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
STATE="$ROOT/tmp/dashboard_state.json"

rm -f "$STATE"
"$ROOT/scripts/tmux/dashboard_collector.sh" --once --smoke --dest "$STATE"

python3 - <<'PY'
import json, sys, pathlib
state_path = pathlib.Path("tmp/dashboard_state.json")
data = json.loads(state_path.read_text())
top = ["status","git","servers","alerts","ci","traces","logs"]
missing = [k for k in top if k not in data]
if missing:
    print(f"missing keys: {missing}")
    sys.exit(1)
if not isinstance(data["servers"], list) or not data["servers"]:
    print("servers must be a non-empty list")
    sys.exit(1)
for srv in data["servers"]:
    for k in ["name","status","port"]:
        if k not in srv:
            print(f"server missing {k}: {srv}")
            sys.exit(1)
print("ok: dashboard_state_schema")
PY
