#!/usr/bin/env bash

# Interactive log search helper for tmux dashboard.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SEARCH_SCRIPT="$ROOT/scripts/log_search.sh"

if [ ! -x "$SEARCH_SCRIPT" ]; then
  echo "Missing $SEARCH_SCRIPT"
  exit 1
fi

export RG_ARGS="${RG_ARGS:-}"
printf '\033]2;Search\007'

echo "Log search REPL (searches logs/ and backend/tasktree/agents/trace/runs/)."
echo "Copy pane: Prefix+y (captures pane to logs/pane_shares + clipboard)."
echo "Enter pattern to search (empty to quit). Extra rg args via RG_ARGS env."
if ! command -v rg >/dev/null 2>&1; then
  echo "ripgrep (rg) is required; please install it."
  exit 0
fi

while true; do
  printf "\npattern> "
  IFS= read -r pattern || break
  if [ -z "$pattern" ]; then
    echo "bye"
    break
  fi
  IFS=' ' read -r -a RG_ARGS_ARR <<<"${RG_ARGS:-}"
  if [ ${#RG_ARGS_ARR[@]} -gt 0 ]; then
    echo "rg args: ${RG_ARGS_ARR[*]}"
  fi
  # Show markdown header with copyable command.
  if [ ${#RG_ARGS_ARR[@]} -gt 0 ]; then
    "$SEARCH_SCRIPT" --md "$pattern" -- "${RG_ARGS_ARR[@]}" || true
  else
    "$SEARCH_SCRIPT" --md "$pattern" || true
  fi
done
