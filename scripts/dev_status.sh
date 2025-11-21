#!/usr/bin/env bash

# Compact live status for the dashboard status pane (designed to fit without scrolling).

set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 1

LOG_DIR="$ROOT/logs"
BACKEND_STAMP="$LOG_DIR/backend-dev.last"
FRONTEND_STAMP="$LOG_DIR/frontend-dev.last"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
LOG_SOURCES_FILE="${LOG_SOURCES_FILE:-$LOG_DIR/log_sources.yaml}"

mkdir -p "$LOG_DIR"
printf '\033]2;Status\007'

ago() {
  local path="$1"
  if [ ! -f "$path" ]; then
    echo "n/a"
    return
  fi
  STAMP_PATH="$path" python3 - <<'PY' 2>/dev/null || date -r "$path" "+%Y-%m-%d %H:%M:%S %Z"
import os
from datetime import datetime, timezone
path = os.environ["STAMP_PATH"]
ts = datetime.fromtimestamp(os.path.getmtime(path), tz=timezone.utc)
now = datetime.now(timezone.utc)
diff = int((now - ts).total_seconds())
if diff < 0:
    diff = 0
units = [("d", 86400), ("h", 3600), ("m", 60)]
for suffix, seconds in units:
    if diff >= seconds:
        print(f"{diff//seconds}{suffix} ago")
        break
else:
    print(f"{diff}s ago")
PY
}

port_status() {
  local label="$1" port_arg="$2"
  local status="🔴" cmd="idle" pid="-" host_for_link="localhost" link_port="$port_arg"
  local link="http://localhost:${link_port}"
  local lan=""
  command -v hostname >/dev/null 2>&1 && lan="$(hostname -I 2>/dev/null | awk '{print $1}')"
  if command -v lsof >/dev/null 2>&1; then
    local line
    line="$(lsof -nP -iTCP:"$port_arg" -sTCP:LISTEN 2>/dev/null | awk 'NR==2 {print}')"
    if [ -n "$line" ]; then
      cmd="$(awk '{print $1}' <<<"$line")"
      pid="$(awk '{print $2}' <<<"$line")"
      local name endpoint host
      name="$(awk '{print $NF}' <<<"$line")"
      endpoint="${name%%(*}"
      endpoint="${endpoint#TCP }"
      endpoint="${endpoint#UDP }"
      host="${endpoint%:*}"
      link_port="${endpoint##*:}"
      [ "$host" = "*" ] || [ "$host" = "0.0.0.0" ] || [ -z "$host" ] || host_for_link="$host"
      [ -z "$link_port" ] && link_port="$port_arg"
      status="🟢"
      link="http://${host_for_link}:${link_port}"
    fi
  fi
  printf "%-8s %s %s (pid %s)\n" "$label:" "$status" "$cmd" "$pid"
  printf "link: %s\n" "$link"
  if [ -n "$lan" ] && [ "$host_for_link" != "$lan" ]; then
    printf "lan : http://%s:%s\n" "$lan" "$link_port"
  fi
}

git_status() {
  if ! command -v git >/dev/null 2>&1 || ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "Git: n/a"
    return
  fi
  local branch head dirty
  branch="$(git symbolic-ref --quiet --short HEAD 2>/dev/null || echo 'detached/none')"
  head="$(git rev-parse --short HEAD 2>/dev/null || echo 'no-commit')"
  dirty="$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
  printf "Git: %s (%s, %s dirty)\n" "$branch" "$head" "$dirty"
}

tasktree_runs() {
  python3 - <<'PY' 2>/dev/null || true
import json
from pathlib import Path
runs = sorted(
    [p for p in Path("backend/tasktree/agents/trace/runs").iterdir() if p.is_dir()],
    key=lambda p: p.stat().st_mtime,
    reverse=True,
)[:2]
print("TaskTree traces (latest 2):")
if not runs:
    print("  none yet"); raise SystemExit
for run in runs:
    meta = {}
    m = run / "meta.json"
    if m.exists():
        try:
            meta = json.loads(m.read_text())
        except Exception:
            meta = {}
    start = str(meta.get("start_time", "?")).split("T",1)[-1]
    end = meta.get("end_time"); end = str(end).split("T",1)[-1] if end else None
    exit_code = meta.get("exit_code")
    cmd = " ".join(meta.get("cmd", []))
    if len(cmd) > 60: cmd = cmd[:57] + "..."
    parts = [f"start:{start}"]
    if end: parts.append(f"end:{end}")
    if exit_code is not None: parts.append(f"exit:{exit_code}")
    if cmd: parts.append(f"cmd:{cmd}")
    print(f"  {run.name} | " + " | ".join(parts))
PY
}

log_sizes() {
  if ! ls "$LOG_DIR"/*-dev.log >/dev/null 2>&1; then
    echo "Logs: none"
    return
  fi
  local back front
  back="$(stat -f%z "$LOG_DIR/backend-dev.log" 2>/dev/null || echo '?')"
  front="$(stat -f%z "$LOG_DIR/frontend-dev.log" 2>/dev/null || echo '?')"
  printf "Logs: backend %sB; frontend %sB\n" "$back" "$front"
}

log_sources_summary() {
  python3 - "$LOG_SOURCES_FILE" <<'PY' 2>/dev/null
import os, sys
from pathlib import Path
cfg = sys.argv[1]
paths = []
if Path(cfg).exists():
    for line in Path(cfg).read_text().splitlines():
        line = line.split("#",1)[0].strip()
        if line.startswith("-"):
            val = line[1:].strip()
            if val:
                paths.append(os.path.expanduser(val))
if not paths:
    print("Sources: none (check logs/log_sources.yaml)")
else:
    head = paths[:3]
    more = len(paths) - len(head)
    suffix = f" [+{more}]" if more > 0 else ""
    print("Sources: " + ", ".join(head) + suffix)
PY
}

print_header() {
  printf "TaskTree dev status — %s\n" "$(date +"%Y-%m-%d %H:%M:%S %Z")"
}

print_header
git_status
echo "Backend: $(ago "$BACKEND_STAMP")"
port_status "Backend" "$BACKEND_PORT"
echo "Frontend: $(ago "$FRONTEND_STAMP")"
port_status "Frontend" "$FRONTEND_PORT"
log_sizes
log_sources_summary
tasktree_runs
if command -v tmux >/dev/null 2>&1 && [ -n "${TMUX:-}" ]; then
  session="$(tmux display-message -p '#S' 2>/dev/null || echo 'ttx')"
  echo "Attach: tmux attach -t $session | Launcher: ./scripts/tmux_dashboard.sh --session $session"
fi
echo "Shortcuts: Prefix+C/y capture | Prefix+T toast | Prefix+H health | Copy pane anywhere: Prefix+y"
