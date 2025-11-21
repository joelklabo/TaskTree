#!/usr/bin/env bash

# Compatibility wrapper: forwards to scripts/tmux/refresh_tmux_dashboard.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec "$ROOT/scripts/tmux/refresh_tmux_dashboard.sh" "$@"
