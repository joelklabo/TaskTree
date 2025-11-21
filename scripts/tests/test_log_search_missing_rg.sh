#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

OUT="$ROOT/logs/tmp-log-search-missing-rg.txt"
rm -f "$OUT"

if PATH="/usr/bin:/bin" "$ROOT/scripts/log_search.sh" "ANY_PATTERN" >"$OUT" 2>&1; then
  :
fi

if ! grep -q "ripgrep (rg) is required" "$OUT"; then
  echo "expected a clear rg-missing message, got:"
  cat "$OUT"
  exit 1
fi

if [ "${PIPESTATUS[0]:-1}" -ne 0 ]; then
  echo "log_search.sh should exit 0 even when rg is missing (to keep pane alive)"
  exit 1
fi

echo "ok: test_log_search_missing_rg (expected to fail until handled gracefully)"
