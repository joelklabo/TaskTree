#!/usr/bin/env bash
# Run backend + frontend dev servers in a dedicated tmux session with port checks.
set -euo pipefail

SESSION=${SESSION:-tasktree-dev}
BACKEND_PORT=${BACKEND_PORT:-8000}
FRONTEND_PORT=${FRONTEND_PORT:-5173} # e2e uses 4173; keep dev on 5173
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

check_port() {
  local port=$1
  if lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $port is already in use. Set BACKEND_PORT/FRONTEND_PORT or stop the other process." >&2
    exit 1
  fi
}

check_port "$BACKEND_PORT"
check_port "$FRONTEND_PORT"

tmux new-session -d -s "$SESSION" -c "$ROOT_DIR/backend" "
while true; do
  uv run uvicorn tasktree.api.app:app --reload --host 127.0.0.1 --port $BACKEND_PORT
  echo \"[dev-supervisor] Backend exited (\$?) - restarting in 2s\"
  sleep 2
done"

tmux split-window -h -t "$SESSION" -c "$ROOT_DIR/frontend" "
while true; do
  npm run dev -- --host 127.0.0.1 --port $FRONTEND_PORT
  echo \"[dev-supervisor] Frontend exited (\$?) - restarting in 2s\"
  sleep 2
done"
tmux select-layout -t "$SESSION" tiled >/dev/null

echo "Started dev supervisor in tmux session '$SESSION' (backend :$BACKEND_PORT, frontend :$FRONTEND_PORT)."
echo "Attach with: tmux attach -t $SESSION (Ctrl-b d to detach)."
