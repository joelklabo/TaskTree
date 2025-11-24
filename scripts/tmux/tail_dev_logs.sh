#!/usr/bin/env bash

set -euo pipefail

printf '\033]2;Log tails\007'

# Start tails; if files do not exist yet, tail will wait once created.
mkdir -p logs
touch logs/backend-dev.log logs/frontend-dev.log
cd backend && uv run python -m tasktree.cli logs watch --sources backend-dev.log,frontend-dev.log --lines 80
