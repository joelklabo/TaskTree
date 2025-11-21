#!/usr/bin/env bash

# Lightweight redraw loop to reduce flicker in tmux panes.

set -euo pipefail

if [ $# -lt 2 ]; then
  echo "Usage: dashboard_loop.sh <interval_seconds> <cmd> [args...]"
  exit 1
fi

INTERVAL="$1"
shift

# Hide cursor and disable line wrap to keep output tidy.
tput civis >/dev/null 2>&1 || true
printf '\033[?7l'
trap 'printf "\033[?7h\033[0m"; tput cnorm >/dev/null 2>&1 || true' EXIT

while :; do
  # Move cursor home and clear to end without a full reset.
  printf '\033[H\033[J'
  "$@" || true
  sleep "$INTERVAL"
done
