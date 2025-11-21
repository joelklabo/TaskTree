#!/usr/bin/env bash

set -euo pipefail

printf '\033]2;Plan\007'
if [ -f docs/PLAN.md ]; then
  printf "docs/PLAN.md (compact)\n\n"
  fmt -w 100 docs/PLAN.md | head -n 140
else
  echo "docs/PLAN.md missing"
fi
