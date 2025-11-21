#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="$ROOT/scripts/peekaboo_capture.sh"

tmp="$(mktemp -d)"
cleanup() {
  rm -rf "$tmp"
}
trap cleanup EXIT

out="$tmp/capture.png"

PEEKABOO_DRY_RUN=1 "$SCRIPT" "$out"

if [ ! -f "$out" ]; then
  echo "peekaboo_capture.sh did not create capture file at $out"
  exit 1
fi

if ! grep -q "DRY_RUN" "$out"; then
  echo "peekaboo_capture.sh did not label dry-run output"
  exit 1
fi
