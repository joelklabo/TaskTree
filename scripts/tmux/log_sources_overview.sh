#!/usr/bin/env bash

# Show stats for configured log sources (counts, latest mtime).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT" || exit 1

python3 - <<'PY'
import os
import glob
import time
from pathlib import Path

config = Path("logs/log_sources.yaml")
globs = [
    "logs/**",
    "backend/tasktree/agents/trace/runs/**",
    os.path.expanduser("~/.copilot/**/logs/**"),
]
if config.exists():
    for line in config.read_text().splitlines():
        line = line.split("#", 1)[0].strip()
        if line.startswith("-"):
            val = line[1:].strip()
            if val:
                globs.append(os.path.expanduser(val))

print("Log sources overview —", time.strftime("%Y-%m-%d %H:%M:%S %Z", time.localtime()))
print()
for g in globs:
    files = [p for p in glob.glob(g, recursive=True) if os.path.isfile(p)]
    if not files:
        continue
    latest = max(files, key=lambda p: os.path.getmtime(p))
    mtime = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(os.path.getmtime(latest)))
    total = len(files)
    size_mb = sum(os.path.getsize(p) for p in files) / (1024 * 1024)
    print(f"- {g}")
    print(f"    files: {total}  size: {size_mb:.2f} MB  latest: {mtime}  path: {latest}")
PY
