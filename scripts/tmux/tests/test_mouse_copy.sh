#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SESSION="ttx-mouse-$$"

"$ROOT/scripts/tmux_dashboard.sh" --session "$SESSION" --no-attach --smoke
trap 'tmux kill-session -t "$SESSION" >/dev/null 2>&1 || true' EXIT

if ! tmux list-keys -T root | grep -q "DoubleClick1Pane.*share_pane"; then
  echo "missing DoubleClick1Pane binding for share_pane (double-click copy)"
  exit 1
fi

SHARE_DIR="$ROOT/logs/pane_shares"
before=$(find "$SHARE_DIR" -type f 2>/dev/null | wc -l | tr -d ' ')

# Simulate copy via direct share_pane invocation (since we can't send a real mouse event here).
pane=$(tmux list-panes -t "$SESSION:dashboard" -F '#{pane_id}' | head -n1)
idx=$(tmux display-message -p -t "$pane" '#{pane_index}')
title=$(tmux display-message -p -t "$pane" '#{pane_title}')
cmd=$(tmux display-message -p -t "$pane" '#{pane_current_command}')
pid=$(tmux display-message -p -t "$pane" '#{pane_pid}')
pwdpane=$(tmux display-message -p -t "$pane" '#{pane_current_path}')

"$ROOT/scripts/share_pane.sh" "$SESSION" "dashboard" "$idx" "$title" "$cmd" "$pid" "$pwdpane" >/tmp/mouse-copy.log 2>&1 || true

after=$(find "$SHARE_DIR" -type f 2>/dev/null | wc -l | tr -d ' ')
if [ "$after" -le "$before" ]; then
  echo "mouse copy simulation did not create a capture (expected via binding behavior)"
  exit 1
fi

echo "ok: test_mouse_copy (expected to fail until mouse binding/capture hooked)"
