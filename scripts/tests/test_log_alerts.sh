#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

LOGFILE="$TMPDIR/alert.log"
CONFIG="$TMPDIR/sources.yaml"
PATTERNS="$TMPDIR/patterns.yaml"

cat >"$LOGFILE" <<'EOF'
2025-01-01 panic: boom
2025-01-01 warning: sunset soon
EOF

cat >"$CONFIG" <<EOF
- $LOGFILE
EOF

cat >"$PATTERNS" <<'EOF'
- pattern: "panic"
  level: critical
  notify: none
  auto_capture: true
  throttle: 0
- pattern: "warning"
  level: low
  notify: none
  auto_capture: false
  throttle: 0
EOF

export LOG_SOURCES_FILE="$CONFIG"
export ALERT_PATTERNS_FILE="$PATTERNS"
export ALERT_CAPTURE_DIR="$TMPDIR/captures"

OUT="$TMPDIR/out.txt"

if ! "$ROOT/scripts/log_alerts.sh" --top 5 --recent 5 >"$OUT"; then
  echo "log_alerts failed"
  exit 1
fi

grep -q "critical" "$OUT" || {
  echo "missing critical in output"
  exit 1
}
grep -q "warning" "$OUT" || {
  echo "missing warning in output"
  exit 1
}

if [ ! -d "$ALERT_CAPTURE_DIR" ] || ! ls "$ALERT_CAPTURE_DIR"/* >/dev/null 2>&1; then
  echo "expected auto_capture file in $ALERT_CAPTURE_DIR"
  exit 1
fi

echo "ok: test_log_alerts severity + capture"
