#!/usr/bin/env bash

# Emit dashboard_state.json for tmux/web dashboards. Source of truth for status/git/servers/alerts/ci/traces/logs.

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: dashboard_collector.sh [--once] [--interval N] [--dest PATH] [--smoke]
  --once         Run one cycle then exit (default: loop)
  --interval N   Seconds between refresh (default: 5)
  --dest PATH    Output path (default: tmp/dashboard_state.json)
  --smoke        Emit synthetic data (no probes)
EOF
}

INTERVAL=5
ONCE=0
SMOKE=0
DEST=""

while [[ $# -gt 0 ]]; do
  case "$1" in
  --once)
    ONCE=1
    shift
    ;;
  --interval)
    INTERVAL="$2"
    shift 2
    ;;
  --dest)
    DEST="$2"
    shift 2
    ;;
  --smoke)
    SMOKE=1
    shift
    ;;
  --help | -h)
    usage
    exit 0
    ;;
  *)
    echo "Unknown arg: $1" >&2
    usage
    exit 1
    ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
mkdir -p "$ROOT/tmp"
DEST="${DEST:-$ROOT/tmp/dashboard_state.json}"
TMP="$DEST.tmp"
CACHE_DIR="$ROOT/logs/tmux/cache"
CACHE="$CACHE_DIR/state.json"
mkdir -p "$CACHE_DIR"

ts_utc() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

probe_git() {
  local branch dirty ahead behind
  branch=$(cd "$ROOT" && git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "n/a")
  dirty=$(cd "$ROOT" && git status --porcelain 2>/dev/null | wc -l | tr -d ' ' || echo 0)
  ahead=0
  behind=0
  if cd "$ROOT" && git rev-parse --verify "@{u}" >/dev/null 2>&1; then
    ahead=$(git rev-list --left-only --count "HEAD...@{u}" 2>/dev/null || echo 0)
    behind=$(git rev-list --right-only --count "HEAD...@{u}" 2>/dev/null || echo 0)
  fi
  export DASH_GIT_BRANCH="$branch" DASH_GIT_DIRTY="$dirty" DASH_GIT_AHEAD="$ahead" DASH_GIT_BEHIND="$behind"
}

probe_ports() {
  local back_port front_port
  back_port="${BACKEND_PORT:-8000}"
  front_port="${FRONTEND_PORT:-5173}"
  BACK_UP=$(lsof -i :"$back_port" >/dev/null 2>&1 && echo true || echo false)
  FRONT_UP=$(lsof -i :"$front_port" >/dev/null 2>&1 && echo true || echo false)
  export DASH_BACKEND_PORT="$back_port" DASH_FRONTEND_PORT="$front_port" DASH_BACKEND_UP="$BACK_UP" DASH_FRONTEND_UP="$FRONT_UP"
}

probe_alerts() {
  local py=""
  if command -v python3 >/dev/null 2>&1; then
    py="python3"
  elif command -v python >/dev/null 2>&1; then
    py="python"
  fi
  if [ -z "$py" ]; then
    DASH_ALERT_JSON='{"total":0,"recent_text":"","recent":[]}'
    return
  fi
  local log_path="${ALERT_LOG_PATH:-$ROOT/logs/tmux/${SESSION:-}/alerts.log}"
  local cache_path="$ROOT/logs/tmux/cache/alerts.out"
  local caps="$ROOT/logs/alert_captures"
  DASH_ALERT_JSON="$(
    ALERT_LOG_PATH=$log_path ALERT_CACHE_PATH=$cache_path ALERT_CAP_DIR=$caps $py - <<'PY'
import json, os, re
from pathlib import Path

log_path = Path(os.environ.get("ALERT_LOG_PATH", ""))
cache_path = Path(os.environ.get("ALERT_CACHE_PATH", ""))
cap_dir = Path(os.environ.get("ALERT_CAP_DIR", ""))

def tail_text(path: Path, n: int = 5) -> str:
    try:
        return "".join(path.read_text(errors="ignore").splitlines(True)[-n:])
    except Exception:
        return ""

total = 0
if cap_dir.exists():
    try:
        total = sum(1 for _ in cap_dir.rglob("*") if _.is_file())
    except Exception:
        total = 0

recent_text = ""
if log_path.exists():
    recent_text = tail_text(log_path, 8)
elif cache_path.exists():
    recent_text = tail_text(cache_path, 8)

recent_entries = []
levels = [
    ("critical", re.compile(r"\b(critical|fatal|panic)\b", re.I)),
    ("high", re.compile(r"\b(error|fail|exception)\b", re.I)),
    ("warn", re.compile(r"\b(warn|warned|deprecated|deprecation)\b", re.I)),
]

for line in recent_text.splitlines():
    clean = line.strip()
    if not clean or clean.startswith("#"):
        continue
    level = "info"
    for name, rx in levels:
        if rx.search(clean):
            level = name
            break
    recent_entries.append(
        {
            "level": level,
            "msg": clean,
            "source": str(log_path) if log_path else "",
        }
    )

print(
    json.dumps(
        {
            "total": total,
            "recent_text": recent_text,
            "recent": recent_entries,
        }
    )
)
PY
  )"
  if [ -z "$DASH_ALERT_JSON" ]; then
    DASH_ALERT_JSON='{"total":0,"recent_text":"","recent":[]}'
  fi
}

probe_ci() {
  local py=""
  if command -v python3 >/dev/null 2>&1; then
    py="python3"
  elif command -v python >/dev/null 2>&1; then
    py="python"
  fi
  if [ -z "$py" ]; then
    DASH_CI_JSON='{"status":"unknown","recent_text":"","runs":[]}'
    return
  fi
  local log_path=""
  if [ -n "${SESSION:-}" ]; then
    log_path="$ROOT/logs/tmux/${SESSION}/ci.log"
  fi
  local cache_out="$ROOT/logs/tmux/cache/ci.out"
  local cache_json="$ROOT/logs/tmux/cache/ci.json"
  local gh_bin="${GH_BIN:-gh}"
  DASH_CI_JSON="$(
    ROOT=$ROOT LOG_PATH=$log_path CACHE_OUT=$cache_out CACHE_JSON=$cache_json GH_BIN=$gh_bin $py - <<'PY'
import json, os, shutil, subprocess
from pathlib import Path

root = Path(os.environ.get("ROOT", "."))
log_path = Path(os.environ.get("LOG_PATH", ""))
cache_out = Path(os.environ.get("CACHE_OUT", ""))
cache_json = Path(os.environ.get("CACHE_JSON", ""))
gh_bin = os.environ.get("GH_BIN", "gh")

def tail_text(path: Path, n: int = 6) -> str:
    try:
        return "".join(path.read_text(errors="ignore").splitlines(True)[-n:])
    except Exception:
        return ""

runs = []
status = "unknown"

def load_cache_json(path: Path):
    try:
        data = json.loads(path.read_text())
        if isinstance(data, dict) and "runs" in data:
            return data
    except Exception:
        return None
    return None

recent_text = tail_text(log_path) or tail_text(cache_out)

if gh_bin and shutil.which(gh_bin):
    try:
        raw = subprocess.check_output(
            [
                gh_bin,
                "run",
                "list",
                "-R",
                "joelklabo/TaskTree",
                "--limit",
                "5",
                "--json",
                "databaseId,status,conclusion,workflowName,headBranch,event,createdAt,updatedAt,url",
            ],
            text=True,
            stderr=subprocess.DEVNULL,
        )
        data = json.loads(raw)
        for item in data:
            if not isinstance(item, dict):
                continue
            runs.append(
                {
                    "workflow": item.get("workflowName") or "unknown",
                    "status": item.get("status") or "unknown",
                    "conclusion": item.get("conclusion") or item.get("status") or "unknown",
                    "branch": item.get("headBranch") or "",
                    "url": item.get("url") or "",
                    "updated_at": item.get("updatedAt") or "",
                }
            )
        if runs:
            status = runs[0].get("conclusion") or runs[0].get("status") or "unknown"
    except Exception:
        pass

if not runs:
    cached = load_cache_json(cache_json)
    if cached:
        runs = cached.get("runs", [])
        status = cached.get("status", status)

if status == "unknown" and runs:
    status = runs[0].get("conclusion") or runs[0].get("status") or "unknown"
if status == "unknown" and recent_text:
    status = "cached"

payload = {
    "status": status,
    "recent_text": "" if runs else recent_text,
    "runs": runs,
}
print(json.dumps(payload))
if cache_json:
    try:
        cache_json_path = Path(cache_json)
        cache_json_path.parent.mkdir(parents=True, exist_ok=True)
        cache_json_path.write_text(json.dumps(payload))
    except Exception:
        pass
PY
  )"
  if [ -z "$DASH_CI_JSON" ]; then
    DASH_CI_JSON='{"status":"unknown","recent_text":"","runs":[]}'
  fi
}

probe_traces() {
  local count
  count=0
  if [ -d "$ROOT/backend/tasktree/agents/trace/runs" ]; then
    count=$(find "$ROOT/backend/tasktree/agents/trace/runs" -type d -maxdepth 1 2>/dev/null | wc -l | tr -d ' ')
  fi
  export DASH_TRACE_RECENT="$count"
}

probe_logs() {
  local sources
  sources=$(rg --no-heading --trim -g'log_sources.yaml' '^- ' "$ROOT/logs/log_sources.yaml" 2>/dev/null | wc -l | tr -d ' ' || echo 0)
  export DASH_LOG_SOURCES="$sources"
}

write_state() {
  cat >"$TMP" <<EOF
{
  "status": { "env": "dev", "ready": true, "updated_at": "$(ts_utc)" },
  "git": { "branch": "$DASH_GIT_BRANCH", "ahead": $DASH_GIT_AHEAD, "behind": $DASH_GIT_BEHIND, "dirty": $DASH_GIT_DIRTY },
  "servers": [
    { "name": "backend", "status": $DASH_BACKEND_UP, "port": $DASH_BACKEND_PORT },
    { "name": "frontend", "status": $DASH_FRONTEND_UP, "port": $DASH_FRONTEND_PORT }
  ],
  "alerts": $DASH_ALERT_JSON,
  "ci": $DASH_CI_JSON,
  "traces": { "recent_runs": $DASH_TRACE_RECENT },
  "logs": { "configured_sources": $DASH_LOG_SOURCES }
}
EOF
  mv "$TMP" "$DEST"
}

write_smoke() {
  cat >"$TMP" <<EOF
{
  "status": { "env": "dev", "ready": true, "updated_at": "$(ts_utc)" },
  "git": { "branch": "main", "ahead": 1, "behind": 0, "dirty": 3 },
  "servers": [
    { "name": "backend", "status": true, "port": 8000 },
    { "name": "frontend", "status": true, "port": 5173 }
  ],
  "alerts": { "total": 2, "recent_text": "smoke alerts", "recent": [ {"level": "warn", "msg": "smoke alert"} ] },
  "ci": { "status": "success", "recent_text": "ci smoke", "runs": [ { "workflow": "ci", "status": "completed", "conclusion": "success", "branch": "main", "url": "" } ] },
  "traces": { "recent_runs": 5 },
  "logs": { "configured_sources": 3 }
}
EOF
  mv "$TMP" "$DEST"
}

run_once() {
  if [ "$SMOKE" -eq 1 ]; then
    write_smoke
    return
  fi
  if [ "${DASH_SIMULATE_FAIL:-0}" = "1" ]; then
    return 1
  fi
  probe_git
  probe_ports
  probe_alerts
  probe_ci
  probe_traces
  probe_logs
  write_state
  cp -f "$DEST" "$CACHE" 2>/dev/null || true
}

while :; do
  if run_once; then
    true
  else
    if [ -s "$CACHE" ]; then
      cp -f "$CACHE" "$DEST"
      echo "(collector fallback from cache: $CACHE)"
    fi
  fi
  if [ "$ONCE" -eq 1 ]; then
    exit 0
  fi
  sleep "$INTERVAL"
done
