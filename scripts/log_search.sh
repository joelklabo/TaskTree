#!/usr/bin/env bash

# Global log search across local and traced logs.

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: log_search.sh [--md] <pattern> [-- <extra ripgrep args>]
Searches:
  - logs/ (tmux pane logs, dev server logs)
  - backend/tasktree/agents/trace/runs/ (trace logs/meta/trace.jsonl)
Examples:
  log_search.sh ERROR
  log_search.sh --md "TaskTree run_id" -- -g '*.jsonl'
EOF
}

md=0
if [[ "${1:-}" == "--md" ]]; then
  md=1
  shift
fi

if [ $# -lt 1 ]; then
  usage
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
pattern="$1"
shift || true

extra=()
if [ $# -gt 0 ]; then
  if [[ "${1:-}" == "--" ]]; then
    shift
  fi
  extra=("$@")
fi

CONFIG="${LOG_SOURCES_FILE:-$ROOT/logs/log_sources.yaml}"

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

paths=()
while IFS= read -r p; do paths+=("$p"); done < <(
  run_python - "$CONFIG" <<'PY'
import sys
import os
from pathlib import Path
from glob import glob

cfg = Path(sys.argv[1])
roots = [
    "logs/**",
    "backend/tasktree/agents/trace/runs/**",
    os.path.expanduser("~/.copilot/**/logs/**"),
]
if cfg.exists():
    for line in cfg.read_text().splitlines():
        line = line.split("#", 1)[0].strip()
        if line.startswith("-"):
            val = line[1:].strip()
            if val:
                roots.append(val)

seen = set()
expanded = []
for root in roots:
    root_expanded = os.path.expanduser(root)
    matches = glob(root_expanded, recursive=True)
    for m in matches:
        if m in seen:
            continue
        seen.add(m)
        expanded.append(m)
    # If the config entry is a directory without a glob, recurse into it.
    if os.path.isdir(root_expanded):
        for p in Path(root_expanded).rglob("*"):
            ps = str(p)
            if os.path.isfile(ps) and ps not in seen:
                seen.add(ps)
                expanded.append(ps)

for p in expanded:
    print(p)
PY
)

if [ ${#paths[@]} -eq 0 ]; then
  echo "No log sources found (check $CONFIG)."
  exit 1
fi

if ! command -v rg >/dev/null 2>&1; then
  echo "ripgrep (rg) is required; please install it."
  exit 0
fi

cmd=(rg --no-heading --line-number --hidden)
if [ ${#extra[@]} -gt 0 ]; then
  cmd+=("${extra[@]}")
fi
cmd+=("$pattern")
valid_paths=()
for p in "${paths[@]}"; do
  if [ -e "$p" ]; then
    valid_paths+=("$p")
  fi
done
if [ ${#valid_paths[@]} -eq 0 ]; then
  echo "No existing log sources found after expansion."
  exit 1
fi
cmd+=("${valid_paths[@]}")
cmd_str="$(printf "%q " "${cmd[@]}")"

if [ "$md" -eq 1 ]; then
  echo "# Log search"
  echo "- pattern: \`$pattern\`"
  if [ ${#extra[@]} -gt 0 ]; then
    echo "- extra: \`$(printf "%q " "${extra[@]}")\`"
  fi
  echo "- paths:"
  for p in "${paths[@]}"; do
    echo "  - \`$p\`"
  done
  echo "- cmd: \`$cmd_str\`"
  echo "- Copy results: \`$cmd_str > search_results.txt\`"
  echo
  echo '```'
else
  echo "Searching for: $pattern"
  echo "Paths: ${paths[*]}"
  if [ ${#extra[@]} -gt 0 ]; then
    echo "Extra rg args: ${extra[*]}"
  fi
  echo "Cmd: $cmd_str"
  echo
fi

set +e
"${cmd[@]}"
code=$?
set -e

if [ "$md" -eq 1 ]; then
  echo '```'
fi

if [ $code -ne 0 ]; then
  echo
  echo "No matches or ripgrep exited non-zero (code $code)."
fi

exit $code
