#!/usr/bin/env bash

# Start the frontend dev server inside tmux with logging + restart stamp.

set -euo pipefail
set -o pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT/logs"
LOG_PATH="$LOG_DIR/frontend-dev.log"
STAMP_PATH="$LOG_DIR/frontend-dev.last"

PORT="${FRONTEND_PORT:-5173}"
HOST="${FRONTEND_HOST:-0.0.0.0}"

mkdir -p "$LOG_DIR"
touch "$STAMP_PATH" "$LOG_PATH"

echo
echo "Frontend dev server -> http://$HOST:$PORT (log: $LOG_PATH)"
printf "[%s] frontend restart\n" "$(date -Iseconds)" | tee -a "$LOG_PATH"

cd "$ROOT/frontend"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm not found; run make setup-frontend first" | tee -a "$LOG_PATH"
  exit 1
fi
if [ ! -d "node_modules" ]; then
  echo "node_modules missing; run make setup-frontend first" | tee -a "$LOG_PATH"
fi

CMD=(npm run dev -- --host "$HOST" --port "$PORT")
{ "${CMD[@]}" 2>&1 | tee -a "$LOG_PATH"; }
