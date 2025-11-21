#!/usr/bin/env bash

# Show the latest TaskTree trace runs from backend/tasktree/agents/trace/runs.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "TaskTree traces — $(date +"%Y-%m-%d %H:%M:%S %Z")"

run_python() {
  local cmd=()
  if command -v python3 >/dev/null 2>&1; then
    cmd=(python3)
  elif command -v python >/dev/null 2>&1; then
    cmd=(python)
  elif command -v uv >/dev/null 2>&1; then
    cmd=(uv run python)
  fi
  if [ ${#cmd[@]} -eq 0 ]; then
    return 1
  fi
  "${cmd[@]}" "$@"
}

if ! run_python - <<'PY'; then
import json
from pathlib import Path

root = Path("backend/tasktree/agents/trace/runs")
if not root.exists():
    print("  none yet")
    raise SystemExit

runs = sorted(
    [p for p in root.iterdir() if p.is_dir()],
    key=lambda p: p.stat().st_mtime,
    reverse=True,
)[:8]

if not runs:
    print("  none yet")
    raise SystemExit

for run in runs:
    meta_path = run / "meta.json"
    meta = {}
    if meta_path.exists():
        try:
            meta = json.loads(meta_path.read_text())
        except Exception:
            meta = {}
    start = meta.get("start_time", "?")
    end = meta.get("end_time")
    exit_code = meta.get("exit_code")
    cmd = " ".join(meta.get("cmd", []))
    print(f"  {run.name}")
    print(f"    start: {start}")
    if end:
        print(f"    end:   {end}")
    if exit_code is not None:
        print(f"    exit:  {exit_code}")
    if cmd:
        short = cmd if len(cmd) <= 120 else cmd[:117] + "..."
        print(f"    cmd:   {short}")
PY
  echo "python not available (need python3/python or uv)"
  exit 0
fi
