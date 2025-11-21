#!/usr/bin/env bash

# Discover likely log locations and propose globs for log_sources.yaml.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG="$ROOT/logs/log_sources.yaml"

defaults=(
  "logs/**"
  "backend/tasktree/agents/trace/runs/**"
)

# Known external candidates (macOS/Linux).
candidates=(
  "$HOME/.copilot/**/logs/**"
  "$HOME/.config/github-copilot/logs/**"
  "$HOME/.local/state/copilot-cli/logs/**"
  "$HOME/Library/Application Support/Code/logs/**"
  "$HOME/.config/Code/logs/**"
  "$HOME/.npm/_logs/**"
)

echo "# Proposed log sources (combine with logs/log_sources.yaml)"
echo

printf "Current config (%s):\n" "$CONFIG"
if [ -f "$CONFIG" ]; then
  sed 's/^/  /' "$CONFIG"
else
  echo "  (missing)"
fi
echo

echo "Discovered candidates:"
added=()
for g in "${defaults[@]}" "${candidates[@]}"; do
  # Expand glob
  matches=$(compgen -G "$g" || true)
  if [ -z "$matches" ]; then
    continue
  fi
  # Deduplicate
  found=0
  for a in "${added[@]}"; do
    if [ "$a" = "$g" ]; then
      found=1
      break
    fi
  done
  if [ $found -eq 0 ]; then
    added+=("$g")
    echo "- $g"
  fi
done

echo
echo "To add, append the desired globs to $CONFIG."
