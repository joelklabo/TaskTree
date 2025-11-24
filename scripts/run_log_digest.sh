#!/usr/bin/env bash
# Wrapper to run log_top_errors.py and append results to a digest log (and optional Prometheus textfile + webhook).
set -euo pipefail

PYTHON_BIN=${PYTHON_BIN:-python3}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_PY="$SCRIPT_DIR/log_top_errors.py"

WINDOW_MIN=${WINDOW_MIN:-10}
TOP=${TOP:-5}
PROM_FILE=${PROM_FILE:-}
WEBHOOK_URL=${WEBHOOK_URL:-}
WEBHOOK_FORMAT=${WEBHOOK_FORMAT:-text}
LOG_GLOB=${LOG_GLOB:-"$HOME/logs/*.log"}
DIGEST_FILE=${DIGEST_FILE:-"$HOME/logs/error_digest.log"}

mkdir -p "$(dirname "$DIGEST_FILE")"

{
  echo "=== $(date -u +"%Y-%m-%d %H:%M:%S%z") window=${WINDOW_MIN}m top=${TOP}"
  # shellcheck disable=SC2086
  "$PYTHON_BIN" "$LOG_PY" --window-min "$WINDOW_MIN" --top "$TOP" ${PROM_FILE:+--prom-file "$PROM_FILE"} ${WEBHOOK_URL:+--webhook-url "$WEBHOOK_URL" --webhook-format "$WEBHOOK_FORMAT"} $LOG_GLOB
  echo
} >>"$DIGEST_FILE" 2>&1
