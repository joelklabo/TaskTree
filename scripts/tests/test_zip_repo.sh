#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

OUT="/tmp/tasktree-zip-test-$$.zip"
rm -f "$OUT"

if ! "$ROOT/zip_repo.sh" --out "$OUT"; then
  echo "zip_repo.sh failed"
  exit 1
fi

UNPACK="$TMPDIR/unpack"
mkdir -p "$UNPACK"
unzip -q "$OUT" -d "$UNPACK"

# Must include a known source file.
if [ ! -f "$UNPACK/Makefile" ]; then
  echo "Makefile missing in zip"
  exit 1
fi

# Must not include heavy ignored dirs.
for forbidden in "logs/tmux" ".bin" "frontend/node_modules"; do
  if [ -e "$UNPACK/$forbidden" ]; then
    echo "forbidden path present: $forbidden"
    exit 1
  fi
done

# Ensure zip size stays sane (<5MB in current repo state).
SZ_KB=$(du -k "$OUT" | cut -f1)
if [ "$SZ_KB" -gt 5000 ]; then
  echo "zip too large: ${SZ_KB}KB"
  exit 1
fi

echo "ok: test_zip_repo"
