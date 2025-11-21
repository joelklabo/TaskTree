#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACK_LOG="$ROOT/logs/e2e-backend.log"
FRONT_LOG="$ROOT/logs/e2e-frontend.log"
mkdir -p "$ROOT/logs"

BACK_PID=""
FRONT_PID=""
cleanup() {
  if [[ -n "$BACK_PID" ]] && kill -0 "$BACK_PID" 2>/dev/null; then
    kill "$BACK_PID" 2>/dev/null || true
  fi
  if [[ -n "$FRONT_PID" ]] && kill -0 "$FRONT_PID" 2>/dev/null; then
    kill "$FRONT_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

start_backend() {
  echo "[e2e] Starting backend..."
  (cd "$ROOT/backend" && uv run uvicorn tasktree.api.app:app --host 127.0.0.1 --port 8000) \
    >"$BACK_LOG" 2>&1 &
  BACK_PID=$!
}

start_frontend() {
  echo "[e2e] Starting frontend dev server..."
  (cd "$ROOT/frontend" && npm run dev -- --host --port 4173 --strictPort) \
    >"$FRONT_LOG" 2>&1 &
  FRONT_PID=$!
}

wait_http() {
  local url="$1"
  local tries=30
  until curl -fsS "$url" >/dev/null 2>&1; do
    tries=$((tries - 1))
    if [[ $tries -le 0 ]]; then
      echo "[e2e] failed waiting for $url" >&2
      return 1
    fi
    sleep 1
  done
}

start_backend
start_frontend
wait_http "http://127.0.0.1:8000/health"
wait_http "http://127.0.0.1:4173"

cd "$ROOT/frontend"
E2E_BASE_URL="http://127.0.0.1:4173" E2E_EXTERNAL=1 npm run e2e

echo "[e2e] success"
