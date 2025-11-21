#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HOOKS_DIR="$ROOT/.git/hooks"

mkdir -p "$HOOKS_DIR"

install() {
  local name="$1"
  local src="$ROOT/scripts/git_hooks/$name"
  local dest="$HOOKS_DIR/$name"
  if [[ -e "$dest" || -L "$dest" ]]; then
    rm -f "$dest"
  fi
  ln -s "$src" "$dest"
  echo "Installed $name hook -> $dest"
}

install pre-commit
install commit-msg

echo "Hooks installed. To skip CI pre-commit: export SKIP_CI_HOOK=1. To skip msg check: SKIP_COMMIT_MSG_HOOK=1."
