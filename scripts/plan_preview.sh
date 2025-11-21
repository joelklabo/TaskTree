#!/usr/bin/env bash

set -euo pipefail

printf '\033]2;TaskTree\007'
echo "Planning notes live in TaskTree flows and traces; no standalone plan document to preview."
echo "Tip: cd backend && uv run tt flows   # list available flows"
