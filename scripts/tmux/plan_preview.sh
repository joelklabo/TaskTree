#!/usr/bin/env bash

# Planning info is managed inside TaskTree flows; keep the dashboard panel informative without a doc.

set -euo pipefail

printf '\033]2;TaskTree\007'
echo "Planning doc removed; use TaskTree flows/traces instead:"
echo "  - cd backend && uv run tt flows"
echo "  - Inspect traces in the app to follow execution."
