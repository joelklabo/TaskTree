#!/usr/bin/env bash

# Bootstrap/update tmux plugins (TPM) locally in the repo.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export TMUX_PLUGIN_MANAGER_PATH="${TMUX_PLUGIN_MANAGER_PATH:-$ROOT/.tmux/plugins}"
TPM_DIR="$TMUX_PLUGIN_MANAGER_PATH/tpm"

mkdir -p "$TMUX_PLUGIN_MANAGER_PATH"

if [ ! -d "$TPM_DIR" ]; then
  echo "Cloning TPM into $TPM_DIR"
  git clone https://github.com/tmux-plugins/tpm "$TPM_DIR"
else
  echo "Updating TPM in $TPM_DIR"
  git -C "$TPM_DIR" pull --ff-only
fi

echo "TPM ready at $TPM_DIR. Inside tmux, press Prefix + I to install plugins."
