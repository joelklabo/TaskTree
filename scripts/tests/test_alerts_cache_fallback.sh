#!/usr/bin/env bash

# Verify cache_wrapper falls back to cached alerts output on command failure.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CACHE_DIR="$ROOT/logs/tmux/cache"
NAME="alerts_cache_fallback_test"

rm -f "$CACHE_DIR/${NAME}.out" "$CACHE_DIR/${NAME}.tmp"

# First run writes cache
first="$("$ROOT/scripts/cache_wrapper.sh" "$NAME" bash -c 'echo first-run')"
if [[ "$first" != "first-run" ]]; then
  echo "expected first-run, got: $first"
  exit 1
fi

if [[ ! -s "$CACHE_DIR/${NAME}.out" ]]; then
  echo "cache file not written"
  exit 1
fi

# Second run fails but should serve cached content with header
second="$("$ROOT/scripts/cache_wrapper.sh" "$NAME" bash -c 'exit 1')"

if ! grep -q "(cached at" <<<"$second"; then
  echo "missing cached header: $second"
  exit 1
fi

if ! grep -q "first-run" <<<"$second"; then
  echo "cached body missing: $second"
  exit 1
fi

# Cleanup to avoid polluting workspace
rm -f "$CACHE_DIR/${NAME}.out" "$CACHE_DIR/${NAME}.tmp"

echo "ok: test_alerts_cache_fallback"
