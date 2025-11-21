#!/usr/bin/env bash

# Preview docs/PLAN.md (compact) for dashboard usage.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PLAN="$ROOT/docs/PLAN.md"
printf '\033]2;Plan\007'

echo "docs/PLAN.md (preview)"
echo
if [ -f "$PLAN" ]; then
  sed -n '1,120p' "$PLAN"
else
  echo "PLAN missing at $PLAN"
fi
