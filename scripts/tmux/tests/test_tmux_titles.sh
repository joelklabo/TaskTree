#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SESSION="ttx-title-$$"

"$ROOT/scripts/tmux_dashboard.sh" --session "$SESSION" --no-attach --smoke
trap 'tmux kill-session -t "$SESSION" >/dev/null 2>&1 || true' EXIT

sleep 1

PANES=$(tmux list-panes -t "$SESSION" -F '#{pane_id}:#{pane_title}')
if echo "$PANES" | awk -F: '$2==""' | grep -q .; then
  echo "found pane(s) without titles:"
  echo "$PANES" | awk -F: '$2==""'
  exit 1
fi

STATUS_LEFT=$(tmux show-options -gqv status-left)
if ! grep -qi "catppuccin" <<<"$STATUS_LEFT" && ! grep -qi "power" <<<"$STATUS_LEFT"; then
  echo "status-left not themed (expected catppuccin/power token)"
  echo "$STATUS_LEFT"
  exit 1
fi

echo "ok: test_tmux_titles (expected to fail until titles/theme enforced)"
