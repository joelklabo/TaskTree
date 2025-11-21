#!/usr/bin/env bash

# Start the backend dev server inside tmux with logging + restart stamp.

set -euo pipefail
set -o pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT/logs"
LOG_PATH="$LOG_DIR/backend-dev.log"
STAMP_PATH="$LOG_DIR/backend-dev.last"

PORT="${BACKEND_PORT:-8000}"
HOST="${BACKEND_HOST:-0.0.0.0}"

mkdir -p "$LOG_DIR"
touch "$STAMP_PATH" "$LOG_PATH"

echo
echo "Backend dev server -> http://$HOST:$PORT (log: $LOG_PATH)"
printf "[%s] backend restart\n" "$(date -Iseconds)" | tee -a "$LOG_PATH"

cd "$ROOT/backend"
export PYTHONUNBUFFERED=1

if ! command -v uv >/dev/null 2>&1 && ! command -v python3 >/dev/null 2>&1 && ! command -v python >/dev/null 2>&1; then
  echo "Neither uv nor python3/python found; run make setup-backend first" | tee -a "$LOG_PATH"
  exit 1
fi

CMD=(uv run uvicorn tasktree.api.app:app --reload --host "$HOST" --port "$PORT")
if ! command -v uv >/dev/null 2>&1; then
  PY_BIN=$(command -v python3 || command -v python)
  echo "uv not found; falling back to ${PY_BIN} -m uvicorn" | tee -a "$LOG_PATH"
  CMD=("$PY_BIN" -m uvicorn tasktree.api.app:app --reload --host "$HOST" --port "$PORT")
fi

"${CMD[@]}" 2>&1 | tee -a "$LOG_PATH"
