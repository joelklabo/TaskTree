#!/usr/bin/env bash

# Respawn tmux dashboard panes with latest commands/layout.

set -eo pipefail

usage() {
  cat <<'EOF'
Usage: refresh_tmux_dashboard.sh [--session NAME]
Refreshes dashboard/search/git/server/log panes for the given session (default: ttx).
EOF
}

SESSION="ttx"
while [[ $# -gt 0 ]]; do
  case "$1" in
  --session | -s)
    SESSION="$2"
    shift 2
    ;;
  --help | -h)
    usage
    exit 0
    ;;
  *)
    echo "Unknown arg: $1"
    usage
    exit 1
    ;;
  esac
done

if ! command -v tmux >/dev/null 2>&1; then
  echo "tmux not found"
  exit 1
fi

if ! tmux has-session -t "$SESSION" 2>/dev/null; then
  echo "Session not found: $SESSION"
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GIT_COMM=${GIT_COMM:-"bash -lc 'echo [refresh git commits]; sleep 1'"}
GIT_STAT=${GIT_STAT:-"bash -lc 'echo [refresh git status]; sleep 1'"}
GIT_DIFF=${GIT_DIFF:-"bash -lc 'echo [refresh git diff]; sleep 1'"}

respawn() {
  local target="$1"
  local cmd="$2"
  tmux respawn-pane -k -t "$target" "$cmd"
}

pane_ids() {
  local window="$1"
  tmux list-panes -t "$SESSION:$window" -F '#{pane_id}'
}

ensure_window() {
  local name="$1"
  local cmd="$2"
  if ! tmux list-windows -t "$SESSION" -F '#{window_name}' | grep -qx "$name"; then
    tmux new-window -t "$SESSION" -c "$ROOT" -n "$name" "$cmd"
  fi
}

ensure_git_window() {
  if tmux list-windows -t "$SESSION" -F '#{window_name}' | grep -qx git; then
    return
  fi
  tmux new-window -t "$SESSION" -c "$ROOT" -n git "$GIT_COMM"
  tmux split-window -h -t "$SESSION:git" -c "$ROOT" "$GIT_STAT"
  tmux split-window -v -t "$SESSION:git" -c "$ROOT" "$GIT_DIFF"
  tmux select-layout -t "$SESSION:git" tiled
}

respawn_window() {
  local window="$1"
  shift
  local panes=()
  if ! pane_ids "$window" >/tmp/refresh_panes.$$ 2>/dev/null; then
    echo "WARN: window $window missing; skipping refresh" >&2
    return
  fi
  while IFS= read -r p; do panes+=("$p"); done </tmp/refresh_panes.$$
  rm -f /tmp/refresh_panes.$$
  local i=0
  for cmd in "$@"; do
    if [ -n "${panes[$i]:-}" ]; then
      respawn "${panes[$i]}" "$cmd"
    fi
    i=$((i + 1))
  done
}

respawn_window "dashboard" \
  "bash -lc 'while true; do clear; ./scripts/dev_status.sh; sleep 5; done'" \
  "bash -lc 'while true; do clear; printf \"docs/PLAN.md (compact)\\n\\n\"; fmt -w 100 docs/PLAN.md | head -n 140; sleep 5; done'" \
  "bash -lc 'while true; do clear; ./scripts/trace_status.sh; sleep 7; done'" \
  "bash -lc 'while true; do clear; printf \"Log tails\\n\\n\"; if [ -f logs/backend-dev.log ]; then tail -n 40 logs/backend-dev.log; else echo \"backend-dev.log not yet created\"; fi; echo; if [ -f logs/frontend-dev.log ]; then tail -n 25 logs/frontend-dev.log; else echo \"frontend-dev.log not yet created\"; fi; sleep 5; done'"

ensure_window "servers" "bash"
respawn_window "servers" "./scripts/dev_backend.sh" "./scripts/dev_frontend.sh"

ensure_window "logs" "bash"
respawn_window "logs" "tail -n 80 -F logs/backend-dev.log" "tail -n 80 -F logs/frontend-dev.log"

ensure_window "search" "bash"
respawn_window "search" "./scripts/log_search_repl.sh"

ensure_git_window
respawn_window "git" \
  "bash -lc 'while true; do clear; echo \"Recent commits (git log -10 --oneline --relative-date)\"; if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then git log -10 --oneline --relative-date; else echo \"Not a git repo\"; fi; sleep 10; done'" \
  "bash -lc 'while true; do clear; echo \"Git status (short)\"; if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then git status -sb; else echo \"Not a git repo\"; fi; sleep 7; done'" \
  "bash -lc 'while true; do clear; echo \"Git diff --stat (staged + unstaged)\"; if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then git diff --stat && echo \"---\" && git diff --stat --cached || true; else echo \"Not a git repo\"; fi; sleep 10; done'"

ensure_window "alerts" "bash"
respawn_window "alerts" "bash -lc 'while true; do clear; ./scripts/log_alerts.sh --top 12 --recent 8; sleep 12; done'"

ensure_window "help" "bash"
respawn_window "help" "bash -lc 'while true; do clear; if [ -f docs/TMUX_HELP.txt ]; then cat docs/TMUX_HELP.txt; else echo \"Add docs/TMUX_HELP.txt\"; fi; sleep 15; done'"

ensure_window "shares" "bash"
# shellcheck disable=SC2012
respawn_window "shares" "bash -lc 'set +u; latest=\"\"; mkdir -p logs/pane_shares; while true; do clear; echo \"Pane shares (latest 20)\"; ls -1t logs/pane_shares 2>/dev/null | head -n 20; echo; latest=$(ls -1t logs/pane_shares 2>/dev/null | head -n 1 2>/dev/null || true); latest=${latest:-}; if [ -n \"$latest\" ]; then echo \"Latest: $latest\"; echo \"---\"; tail -n 120 \"logs/pane_shares/$latest\" 2>/dev/null; fi; sleep 6; done'"

ensure_window "sources" "bash"
respawn_window "sources" "bash -lc 'while true; do clear; ./scripts/log_sources_overview.sh; sleep 10; done'"

echo "Refreshed panes in session '$SESSION'."
