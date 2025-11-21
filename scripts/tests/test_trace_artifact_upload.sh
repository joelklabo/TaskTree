#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="$ROOT/scripts/trace_artifact_upload.sh"

tmp="$(mktemp -d)"
cleanup() {
  rm -rf "$tmp"
}
trap cleanup EXIT

src="$tmp/src.txt"
dest_dir="$tmp/dest"
echo "hello" >"$src"

TRACER_ARTIFACT_DIR="$dest_dir" "$SCRIPT" "$src" "copied.txt" >/dev/null

if [ ! -f "$dest_dir/copied.txt" ]; then
  echo "trace_artifact_upload.sh did not copy artifact to destination"
  exit 1
fi
