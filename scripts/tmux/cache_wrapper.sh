#!/usr/bin/env bash

# Cache wrapper: runs a command, caches its stdout, and falls back to the cache on failure/empty output.

set -euo pipefail

if [ $# -lt 2 ]; then
  echo "Usage: cache_wrapper.sh <name> <cmd> [args...]"
  exit 1
fi

NAME="$1"
shift

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CACHE_DIR="$ROOT/logs/tmux/cache"
mkdir -p "$CACHE_DIR"
CACHE_FILE="$CACHE_DIR/${NAME}.out"
TMP_FILE="$CACHE_DIR/${NAME}.tmp"

ts() {
  date -Iseconds
}

if "$@" >"$TMP_FILE" 2>&1; then
  if [ -s "$TMP_FILE" ]; then
    mv "$TMP_FILE" "$CACHE_FILE"
    cat "$CACHE_FILE"
    exit 0
  fi
fi

# If tmp exists but empty, discard to avoid poisoning cache.
if [ -f "$TMP_FILE" ]; then
  rm -f "$TMP_FILE"
fi

# Fallback to cache if present.
rm -f "$TMP_FILE"
if [ -s "$CACHE_FILE" ]; then
  echo "(cached at $(ts))"
  cat "$CACHE_FILE"
  exit 0
fi

echo "(no cache available for $NAME)"
exit 0
