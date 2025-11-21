#!/usr/bin/env bash
set -euo pipefail
# Simple launcher for the log trigger flow. Intended for local use.
#
# Env:
#   LOG_PATH: path to log file (default: tmp/dev-app.log)
#   FLOW_ID: flow to run (default: log_error_handler)
#   PATTERNS: space-separated regex patterns (default: "ERROR Exception Traceback")
#   DRY_RUN: if set to "1", run in dry-run mode

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

LOG_PATH="${LOG_PATH:-tmp/dev-app.log}"
FLOW_ID="${FLOW_ID:-log_error_handler}"
PATTERNS="${PATTERNS:-ERROR Exception Traceback}"
DRY_RUN="${DRY_RUN:-0}"
CONTEXT_LINES="${CONTEXT_LINES:-3}"
LOG_DEST="${LOG_DEST:-}"

if ! command -v uv >/dev/null 2>&1; then
  echo "uv not found on PATH; install uv first (see README)" >&2
  exit 1
fi

mapfile -t pattern_args < <(printf '%s\n' "${PATTERNS}")

cmd=(
  uv run tasktree.log_trigger
  --paths "${LOG_PATH}"
  --flow-id "${FLOW_ID}"
  --min-interval 30
  --context-lines "${CONTEXT_LINES}"
)

if [ "${DRY_RUN}" = "1" ]; then
  cmd+=(--dry-run)
fi

if [ -n "${LOG_DEST}" ]; then
  cmd+=(--log-dest "${LOG_DEST}")
fi

for pat in "${pattern_args[@]}"; do
  cmd+=(--patterns "${pat}")
done

cd "${ROOT}"
echo "[watch_logs] running: ${cmd[*]}"
exec "${cmd[@]}"
