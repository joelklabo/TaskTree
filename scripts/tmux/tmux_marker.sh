#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SESSION="${1:-ttx}"
FILE="$ROOT/logs/dashboard_session.txt"
mkdir -p "$ROOT/logs"

cat >"$FILE" <<EOF
session: $SESSION
attach: tmux attach -t $SESSION
launcher: ./scripts/tmux_dashboard.sh --session $SESSION
logs: $ROOT/logs/tmux/$SESSION
sources: $ROOT/logs/log_sources.yaml
EOF

echo "Wrote $FILE"
