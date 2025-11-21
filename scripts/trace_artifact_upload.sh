#!/usr/bin/env bash
# Best-effort trace artifact uploader: copies a file into a trace artifacts dir.
set -euo pipefail

usage() {
  echo "usage: scripts/trace_artifact_upload.sh <source_path> [artifact_name]" >&2
}

if [ $# -lt 1 ]; then
  usage
  exit 1
fi

SRC="$1"
ARTIFACT_NAME="${2:-$(basename "$SRC")}"
DEST_ROOT="${TRACER_ARTIFACT_DIR:-frontend/test-results/peekaboo}"
DEST="$DEST_ROOT/$ARTIFACT_NAME"

if [ ! -f "$SRC" ]; then
  echo "skip: source file not found: $SRC" >&2
  exit 0
fi

mkdir -p "$DEST_ROOT"
cp "$SRC" "$DEST"
echo "uploaded artifact to $DEST"
