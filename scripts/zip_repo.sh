#!/usr/bin/env bash

# Create a code-only zip archive that respects .gitignore (tracked + untracked, non-ignored files).

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/zip_repo.sh [--out PATH] [--keep-logs] [--keep-node-modules] [--keep-bin] [--copy-path]
Creates a zip containing only files not ignored by .gitignore (git ls-files --cached --others --exclude-standard).
Output can be anywhere (e.g., /tmp/tasktree.zip). Default: /tmp/tasktree-code-<timestamp>.zip.
Flags:
  --out PATH           Set output zip path (default: /tmp/tasktree-code-<timestamp>.zip)
  --keep-logs          Also include logs/ (otherwise excluded by .gitignore)
  --keep-node-modules  Also include frontend/node_modules/ if present (ignored by default)
  --keep-bin           Also include .bin/ tool binaries (ignored by default)
  --copy-path          Copy the resulting zip path to clipboard (best effort)
EOF
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ts() { date +"%Y%m%d-%H%M%S"; }

OUT=""
KEEP_LOGS=0
KEEP_NODE=0
KEEP_BIN=0
COPY_PATH=0

while [[ $# -gt 0 ]]; do
  case "$1" in
  -h | --help)
    usage
    exit 0
    ;;
  --out)
    OUT="$2"
    shift 2
    ;;
  --keep-logs)
    KEEP_LOGS=1
    shift
    ;;
  --keep-node-modules)
    KEEP_NODE=1
    shift
    ;;
  --keep-bin)
    KEEP_BIN=1
    shift
    ;;
  --copy-path)
    COPY_PATH=1
    shift
    ;;
  *)
    OUT="$1"
    shift
    ;; # fallback positional for output
  esac
done

if [ -z "$OUT" ]; then
  OUT="/tmp/tasktree-code-$(ts).zip"
fi

mkdir -p "$(dirname "$OUT")"

cd "$ROOT"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not a git repository: $ROOT" >&2
  exit 1
fi

# Build the file list respecting .gitignore (tracked + untracked, non-ignored) and stream to zip.
if ! git -C "$ROOT" ls-files -z --cached --others --exclude-standard |
  tr '\0' '\n' |
  sed '/^$/d' |
  zip -q -9 -@ "$OUT"; then
  echo "zip failed (maybe empty file list?)" >&2
  exit 1
fi

# Optional additions (ignored by git by default).
cd "$ROOT"
if [ "$KEEP_LOGS" -eq 1 ] && [ -d "logs" ]; then
  zip -qr -9 "$OUT" logs
fi
if [ "$KEEP_NODE" -eq 1 ] && [ -d "frontend/node_modules" ]; then
  zip -qr -9 "$OUT" frontend/node_modules
fi
if [ "$KEEP_BIN" -eq 1 ] && [ -d ".bin" ]; then
  zip -qr -9 "$OUT" .bin
fi

echo "Created $OUT"
if command -v du >/dev/null 2>&1; then
  SIZE=$(du -h "$OUT" | cut -f1)
  echo "Size: $SIZE"
fi

if [ "$COPY_PATH" -eq 1 ]; then
  if command -v pbcopy >/dev/null 2>&1; then
    printf "%s" "$OUT" | pbcopy && echo "Path copied to clipboard (pbcopy)."
  elif command -v xclip >/dev/null 2>&1; then
    printf "%s" "$OUT" | xclip -selection clipboard && echo "Path copied to clipboard (xclip)."
  else
    echo "Clipboard copy requested but no pbcopy/xclip available."
  fi
fi
