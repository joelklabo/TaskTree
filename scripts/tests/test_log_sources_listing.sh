#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SESSION="ttx-sources-$$"
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"; tmux kill-session -t "$SESSION" >/dev/null 2>&1 || true' EXIT

SRC="$TMPDIR/sources.yaml"
MYLOG="$TMPDIR/custom.log"
echo "hello" >"$MYLOG"
cat >"$SRC" <<EOF
- $MYLOG
EOF

LOG_SOURCES_FILE="$SRC" "$ROOT/scripts/tmux_dashboard.sh" --session "$SESSION" --no-attach --smoke

STATUS_LOG="$ROOT/logs/tmux/$SESSION/dashboard-status.log"

tries=8
until grep -q "$MYLOG" "$STATUS_LOG"; do
  tries=$((tries - 1))
  if [ $tries -le 0 ]; then
    echo "status pane missing log source from YAML ($MYLOG)"
    cat "$STATUS_LOG" || true
    exit 1
  fi
  sleep 1
done

echo "ok: test_log_sources_listing (expected to fail until status lists YAML sources)"
