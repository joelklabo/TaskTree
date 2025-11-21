#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

BACK=38080
FRONT=38081

python3 -m http.server "$BACK" --directory "$TMPDIR" >/dev/null 2>&1 &
PID_BACK=$!
python3 -m http.server "$FRONT" --directory "$TMPDIR" >/dev/null 2>&1 &
PID_FRONT=$!
trap 'kill $PID_BACK $PID_FRONT >/dev/null 2>&1 || true; rm -rf "$TMPDIR"' EXIT

sleep 1

OUT="$(BACKEND_PORT=$BACK FRONTEND_PORT=$FRONT "$ROOT/scripts/dev_status.sh")" || true

echo "$OUT" | grep -q "http://localhost:${BACK}" || {
  echo "status missing backend link with host+port"
  echo "$OUT"
  exit 1
}

echo "$OUT" | grep -q "http://localhost:${FRONT}" || {
  echo "status missing frontend link with host+port"
  echo "$OUT"
  exit 1
}

LINES=$(echo "$OUT" | wc -l | tr -d ' ')
if [ "$LINES" -gt 18 ]; then
  echo "status output too long (${LINES} lines); should be compact to avoid scroll"
  exit 1
fi

echo "ok: test_status_links (expected to fail until links/compactness fixed)"
