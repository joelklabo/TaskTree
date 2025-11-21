#!/usr/bin/env bash
# Capture a screenshot via Peekaboo CLI (or dry-run), used by Playwright failure hooks.
set -euo pipefail

usage() {
  echo "usage: scripts/peekaboo_capture.sh <output.png> [--describe]" >&2
}

if [ $# -lt 1 ]; then
  usage
  exit 1
fi

OUTPUT="$1"
shift
DESCRIBE=0

while [ $# -gt 0 ]; do
  case "$1" in
  --describe)
    DESCRIBE=1
    ;;
  *)
    echo "unknown option: $1" >&2
    usage
    exit 1
    ;;
  esac
  shift
done

mkdir -p "$(dirname "$OUTPUT")"

# Always leave an artifact so callers can attach or inspect even when skipped.
record_note() {
  echo "$1" >"$OUTPUT"
}

if [ "${PEEKABOO_DRY_RUN:-0}" = "1" ]; then
  record_note "PEEKABOO_DRY_RUN: would capture and${DESCRIBE:+ describe } to $OUTPUT"
  exit 0
fi

BIN="${PEEKABOO_BIN:-peekaboo}"

if ! command -v "$BIN" >/dev/null 2>&1; then
  record_note "PEEKABOO_SKIP: binary '$BIN' not found; skipping capture"
  exit 0
fi

cmd=("$BIN" "capture" "--output" "$OUTPUT")
if [ "$DESCRIBE" -eq 1 ]; then
  cmd+=("--describe")
fi

log_path="${OUTPUT}.log"

if ! "${cmd[@]}" >"$log_path" 2>&1; then
  record_note "PEEKABOO_FAILED: capture command returned nonzero; see $log_path"
  exit 0
fi

if [ ! -s "$OUTPUT" ]; then
  record_note "PEEKABOO_EMPTY: capture reported success but produced no file; see $log_path"
fi
