#!/usr/bin/env bash

# Capture a tmux pane with metadata, save to logs/pane_shares, and optionally copy to clipboard.

set -euo pipefail

if [ $# -lt 7 ]; then
  echo "Usage: share_pane.sh <session> <window> <pane_index> <pane_title> <pane_cmd> <pane_pid> <pane_path>"
  exit 1
fi

SESSION="$1"
WINDOW="$2"
PANE="$3"
TITLE="$4"
CMD="$5"
PID="$6"
PATH_CWD="$7"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT/logs/pane_shares"
mkdir -p "$OUT_DIR"

TS="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$OUT_DIR/${TS}_${SESSION}_${WINDOW}_${PANE}.txt"

{
  echo "# Pane capture"
  echo "timestamp: $TS"
  echo "session: $SESSION"
  echo "window: $WINDOW"
  echo "pane: $PANE"
  echo "title: $TITLE"
  echo "cmd: $CMD"
  echo "pid: $PID"
  echo "cwd: $PATH_CWD"
  echo
  echo "----- pane output -----"
} >"$FILE"

# Capture pane contents.
tmux capture-pane -ep -t "$SESSION:$WINDOW.$PANE" >>"$FILE"

# Clipboard if available.
COPIED=""
if command -v pbcopy >/dev/null 2>&1; then
  pbcopy <"$FILE" && COPIED=" (copied to clipboard)"
elif command -v xclip >/dev/null 2>&1; then
  xclip -selection clipboard <"$FILE" && COPIED=" (copied to clipboard)"
fi

echo "saved: $FILE$COPIED"
