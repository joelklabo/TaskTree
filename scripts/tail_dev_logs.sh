#!/usr/bin/env bash

set -euo pipefail

printf '\033]2;Log tails\007'

# Start tails; if files do not exist yet, tail will wait once created.
mkdir -p logs
touch logs/backend-dev.log logs/frontend-dev.log
tail -n 80 -F logs/backend-dev.log logs/frontend-dev.log
