#!/usr/bin/env bash

# Thin wrapper to route to the canonical tmux cache wrapper.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$ROOT/tmux/cache_wrapper.sh" "$@"
