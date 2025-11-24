#!/usr/bin/env bash
set -euo pipefail

# Find all shell scripts
# Exclude node_modules, .venv, .git, and this script itself
# Search for 'tail -f' or 'tail -F'
# Ignore lines with '# nolint: tail'

echo "Checking for direct log tailing (tail -f/F)..."

VIOLATIONS=$(grep -rE "tail\s+.*-[a-zA-Z]*[fF]" . \
  --include="*.sh" \
  --exclude-dir="node_modules" \
  --exclude-dir=".venv" \
  --exclude-dir=".git" \
  --exclude-dir=".tmux" \
  --exclude="lint_log_tailing.sh" |
  grep -v "tasktree.cli" |
  grep -v "# nolint: tail" || true)

if [ -n "$VIOLATIONS" ]; then
  echo "Found direct log tailing violations:"
  echo "$VIOLATIONS"
  echo ""
  echo "Please use the CLI to view logs instead of direct tailing."
  echo "If this is a legitimate use case, add '# nolint: tail' to the line."
  exit 1
fi

echo "No direct log tailing found."
