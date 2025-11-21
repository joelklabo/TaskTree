#!/usr/bin/env bash

# Placeholder regression: search output should include a copyable command header.
# Fails now because the pane doesn't surface a "Copy results" block.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

LOG="$TMPDIR/bug.log"
echo "BUG_HUNT" >"$LOG"

CFG="$TMPDIR/sources.yaml"
cat >"$CFG" <<EOF
- $LOG
EOF

OUT="$TMPDIR/out.txt"
if LOG_SOURCES_FILE="$CFG" "$ROOT/scripts/log_search.sh" --md "BUG_HUNT" >"$OUT"; then
  :
fi

if ! grep -q "Copy results" "$OUT"; then
  echo "missing copyable results header in search output"
  cat "$OUT"
  exit 1
fi

echo "ok: test_log_search_bug (expected to fail until copy block added)"
