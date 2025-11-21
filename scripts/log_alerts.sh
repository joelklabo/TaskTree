#!/usr/bin/env bash

# Aggregate errors/warnings across logs and trace runs; print ranked summary plus recent hits.

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: log_alerts.sh [--top N] [--recent M]
  --top N     Number of top messages to show (default: 10)
  --recent M  Number of recent matched lines to show (default: 5)
Searches:
  - logs/ (tmux pane logs, dev server logs)
  - backend/tasktree/agents/trace/runs/ (trace logs/meta/trace.jsonl)
Patterns: configured via logs/alert_patterns.yaml (or $ALERT_PATTERNS_FILE). Each rule may set level/notify/auto_capture/throttle. Defaults cover error/warn/exception/traceback/deprecate/fail/fatal/panic/timeout/permission denied/connection refused/unavailable/throttle/oom.
EOF
}

TOP=10
RECENT=5
while [[ $# -gt 0 ]]; do
  case "$1" in
  --top)
    TOP="$2"
    shift 2
    ;;
  --recent)
    RECENT="$2"
    shift 2
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

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG="${LOG_SOURCES_FILE:-$ROOT/logs/log_sources.yaml}"
PATTERNS_FILE="${ALERT_PATTERNS_FILE:-$ROOT/logs/alert_patterns.yaml}"
CAPTURE_DIR="${ALERT_CAPTURE_DIR:-$ROOT/logs/alert_captures}"
mkdir -p "$CAPTURE_DIR"
printf '\033]2;Alerts\007'

export ALERT_TOP="$TOP"
export ALERT_RECENT="$RECENT"
export ALERT_CONFIG="$CONFIG"
export ALERT_PATTERNS_FILE="$PATTERNS_FILE"
export ALERT_CAPTURE_DIR="$CAPTURE_DIR"
export ALERT_ROOT="$ROOT"

if ! run_python - <<'PY'; then
import os
import re
import sys
import time
import glob
from pathlib import Path
from collections import defaultdict, deque

TOP = int(os.environ["ALERT_TOP"])
RECENT = int(os.environ["ALERT_RECENT"])
cfg_path = Path(os.environ["ALERT_CONFIG"])
patterns_path = Path(os.environ["ALERT_PATTERNS_FILE"])
capture_dir = Path(os.environ["ALERT_CAPTURE_DIR"])
root_path = Path(os.environ["ALERT_ROOT"])

paths = []

globs = [
    "logs/**",
    "backend/tasktree/agents/trace/runs/**",
]
if cfg_path.exists():
    for line in cfg_path.read_text().splitlines():
        line = line.split("#", 1)[0].strip()
        if line.startswith("-"):
            val = line[1:].strip()
            if val:
                globs.append(val)

seen = set()
for g in globs:
    exp = os.path.expanduser(g)
    for m in glob.glob(exp, recursive=True):
        p = Path(m)
        if p.is_file() and p not in seen:
            seen.add(p)
            paths.append(p)
    if os.path.isdir(exp):
        for p in Path(exp).rglob("*"):
            if p.is_file() and p not in seen:
                seen.add(p)
                paths.append(p)

DEFAULT_PATTERNS = [
    {"pattern": "fatal|panic|oom", "level": "critical", "auto_capture": True, "notify": "toast", "throttle": 60},
    {"pattern": "error|exception|traceback|fail(?:ed|ure)?|timeout|timed out", "level": "high", "auto_capture": True, "notify": "toast", "throttle": 120},
    {"pattern": "permission denied|connection refused|unavailable|throttle", "level": "high", "auto_capture": False, "notify": "toast", "throttle": 180},
    {"pattern": "deprecat(?:ed|ion)|warn|warning", "level": "low", "auto_capture": False, "notify": "none", "throttle": 0},
]

def parse_patterns(path: Path):
    rules = []
    if path.exists():
        text = path.read_text()
        try:
            import yaml  # type: ignore
            data = yaml.safe_load(text)
            if isinstance(data, list):
                for item in data:
                    if isinstance(item, dict):
                        rules.append(item)
                    elif isinstance(item, str):
                        rules.append({"pattern": item})
        except Exception:
            current = None
            for raw in text.splitlines():
                line = raw.split("#", 1)[0].rstrip()
                if not line:
                    continue
                if line.startswith("-"):
                    if current:
                        rules.append(current)
                    current = {}
                    remainder = line[1:].strip()
                    if remainder and ":" not in remainder:
                        current["pattern"] = remainder
                    elif ":" in remainder:
                        k, v = remainder.split(":", 1)
                        current[k.strip()] = v.strip()
                elif current is not None and ":" in line:
                    k, v = line.split(":", 1)
                    current[k.strip()] = v.strip()
            if current:
                rules.append(current)
    if not rules:
        rules = DEFAULT_PATTERNS
    normalized = []
    for rule in rules:
        pat = rule.get("pattern")
        if not pat:
            continue
        pat = str(pat).strip().strip('"\'' )
        level = str(rule.get("level", "medium")).lower()
        notify = str(rule.get("notify", "toast")).lower()
        auto_capture = str(rule.get("auto_capture", "false")).lower() in ("1", "true", "yes", "y", "on")
        try:
            throttle = int(rule.get("throttle", 0))
        except Exception:
            throttle = 0
        normalized.append(
            {
                "pattern": pat,
                "level": level if level in {"critical", "high", "medium", "low"} else "medium",
                "notify": notify if notify in {"toast", "bell", "none"} else "toast",
                "auto_capture": auto_capture,
                "throttle": max(throttle, 0),
            }
        )
    return normalized

rules = parse_patterns(patterns_path)
compiled = []
for idx, rule in enumerate(rules):
    try:
        regex = re.compile(rule["pattern"], re.IGNORECASE)
    except re.error:
        continue
    compiled.append((idx, regex, rule))

state = {
    idx: {"count": 0, "last": None, "recent": deque(maxlen=RECENT), "last_alert_ts": 0, "captures": []}
    for idx, _, _ in compiled
}

levels_order = ["critical", "high", "medium", "low"]

counts = defaultdict(int)
last = {}
recent_lines = deque(maxlen=RECENT)

def normalize(line: str) -> str:
    s = line.strip()
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"\d+", "<num>", s)
    return s[:200].lower()

cap_root = capture_dir.resolve()
pat_root = patterns_path.resolve()
root_cap_root = (root_path / "logs/alert_captures").resolve()

for path in paths:
    pres = path.resolve()
    if pres == pat_root or path.name == "alert_patterns.yaml":
        continue
    try:
        pres.relative_to(cap_root)
        continue
    except Exception:
        pass
    try:
        pres.relative_to(root_cap_root)
        continue
    except Exception:
        pass
    try:
        text = path.read_text(errors="ignore")
    except Exception:
        continue
    lines = text.splitlines()
    for lno, line in enumerate(lines, 1):
        for idx, rx, rule in compiled:
            if not rx.search(line):
                continue
            key = normalize(line)
            counts[key] += 1
            last[key] = f"{path}:{lno}"
            recent_lines.append(f"{path}:{lno}: {line.strip()}")
            st = state[idx]
            st["count"] += 1
            st["last"] = f"{path}:{lno}"
            st["recent"].append(f"{path}:{lno}: {line.strip()}")
            now = time.time()
            should_alert = now - st["last_alert_ts"] >= rule["throttle"]
            if should_alert:
                st["last_alert_ts"] = now
                capture_note = ""
                if rule["auto_capture"]:
                    capture_dir.mkdir(parents=True, exist_ok=True)
                    fname = f"{int(now)}_{idx}.txt"
                    cpath = capture_dir / fname
                    start = max(0, lno - 3)
                    end = min(len(lines), lno + 2)
                    with cpath.open("w", encoding="utf-8") as fh:
                        fh.write("# Alert capture\n")
                        fh.write(f"rule: {rule['pattern']}\n")
                        fh.write(f"level: {rule['level']}\n")
                        fh.write(f"source: {path}:{lno}\n")
                        fh.write("context:\n")
                        for cline in lines[start:end]:
                            fh.write(cline + "\n")
                    st["captures"].append(str(cpath))
                    capture_note = f" capture: {cpath}"
                if rule["notify"] != "none":
                    try:
                        import subprocess
                        msg = f"[{rule['level']}] {rule['pattern']} -> {path}:{lno}{capture_note}"
                        subprocess.run(["tmux", "display-message", msg], check=False)
                        if rule["notify"] == "bell":
                            sys.stdout.write("\a")
                    except Exception:
                        pass

print("# Alerts (errors/warnings)")
print(f"- sources: logs/, backend/tasktree/agents/trace/runs/")
print(f"- patterns file: {patterns_path}")
print(f"- active patterns: {', '.join([r['pattern'] for _, _, r in compiled])}")
print(f"- cmd: log_alerts.sh --top {TOP} --recent {RECENT}")
print()

if not any(st["count"] for st in state.values()):
    print("No matches found.")
    sys.exit(0)

print("Top messages (normalized):")
for i, (key, count) in enumerate(sorted(counts.items(), key=lambda kv: kv[1], reverse=True)[:TOP], 1):
    where = last.get(key, "?")
    print(f"{i:2d}. [{count}] {key}  (last: {where})")

print()
print("By level:")
by_level = defaultdict(list)
for idx, _, rule in compiled:
    st = state[idx]
    if st["count"] == 0:
        continue
    by_level[rule["level"]].append((st["count"], st, rule))

for level in levels_order:
    entries = sorted(by_level.get(level, []), key=lambda t: t[0], reverse=True)
    if not entries:
        continue
    print(f"- {level}:")
    for count, st, rule in entries:
        capture_note = f" capture={st['captures'][-1]}" if st["captures"] else ""
        print(f"  * [{count}] {rule['pattern']} (last: {st['last']}{capture_note}) notify={rule['notify']} auto_capture={rule['auto_capture']} throttle={rule['throttle']}s")

print()
print(f"Recent {len(recent_lines)} hits:")
for line in list(recent_lines)[-RECENT:]:
    print(f"- {line}")
PY
  echo "# Alerts (errors/warnings)"
  echo "python not available (need python3/python or uv)"
  exit 0
fi
