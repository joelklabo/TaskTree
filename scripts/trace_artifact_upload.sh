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

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SRC="$1"
ARTIFACT_NAME="${2:-$(basename "$SRC")}"
TRACE_ROOT="${TASKTREE_TRACE_ROOT:-$ROOT/backend/tasktree/agents/trace/runs}"
DEFAULT_DEST="$ROOT/frontend/test-results/peekaboo"

if [ -n "${TRACER_ARTIFACT_DIR:-}" ]; then
  DEST_ROOT="$TRACER_ARTIFACT_DIR"
elif [ -n "${TASKTREE_TRACE_RUN_ID:-}" ]; then
  DEST_ROOT="$TRACE_ROOT/$TASKTREE_TRACE_RUN_ID/artifacts/peekaboo"
else
  DEST_ROOT="$DEFAULT_DEST"
fi
DEST="$DEST_ROOT/$ARTIFACT_NAME"

if [ ! -f "$SRC" ]; then
  echo "skip: source file not found: $SRC" >&2
  exit 0
fi

mkdir -p "$DEST_ROOT"
cp "$SRC" "$DEST"
echo "uploaded artifact to $DEST"
