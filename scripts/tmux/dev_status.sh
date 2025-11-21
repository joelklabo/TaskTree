#!/usr/bin/env bash

# Render compact status view from dashboard_state.json (collector output).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STATE="${DASHBOARD_STATE:-$ROOT/tmp/dashboard_state.json}"
CONFIG="${LOG_SOURCES_FILE:-$ROOT/logs/log_sources.yaml}"
printf '\033]2;Status\007'

ts() {
  date -Iseconds
}

render() {
  python3 - <<'PY'
import json, os, pathlib, sys
state_path = pathlib.Path(os.environ.get("STATE", "tmp/dashboard_state.json"))
cfg_path = pathlib.Path(os.environ.get("CONFIG", "logs/log_sources.yaml"))
now = os.environ.get("NOW", "")
print(f"TaskTree dev status — {now}")
if not state_path.exists():
    print("(state missing; run dashboard_collector)")
    sys.exit(0)
try:
    data = json.loads(state_path.read_text())
except Exception as e:
    print(f"(state unreadable: {e})")
    sys.exit(0)
git = data.get("git", {})
servers = data.get("servers", [])
status = data.get("status", {})
env = status.get("env", "dev")
print(f"Env: {env}")
print(f"Git: {git.get('branch','n/a')} (ahead {git.get('ahead',0)}, behind {git.get('behind',0)}, dirty {git.get('dirty',0)})")
for srv in servers:
    name = srv.get("name","srv")
    port = srv.get("port","")
    up = srv.get("status", False)
    host = "localhost"
    scheme = "http"
    print(f"{name.capitalize():<8}: {'up' if up else 'down'}  {scheme}://{host}:{port}")
print("Log sources:")
if cfg_path.exists():
    for line in cfg_path.read_text().splitlines():
        line = line.split("#",1)[0].strip()
        if line.startswith("-"):
            val = line[1:].strip()
            if val:
                print(f"- {val}")
else:
    print(f"- (missing {cfg_path})")
PY
}

NOW="$(ts)" STATE="$STATE" CONFIG="$CONFIG" render
