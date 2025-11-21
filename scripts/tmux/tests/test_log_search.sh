#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

tmp="$(mktemp -d)"
cleanup() {
  rm -rf "$tmp"
}
trap cleanup EXIT

log_dir="$tmp/external_logs"
mkdir -p "$log_dir"
echo "SPECIAL_ERROR 123" >"$log_dir/app.log"

cfg="$tmp/log_sources.yaml"
cat >"$cfg" <<EOF
- $log_dir/**
EOF

LOG_SOURCES_FILE="$cfg" "$ROOT/scripts/log_search.sh" "SPECIAL_ERROR" >"$tmp/out.txt"

if ! grep -q "SPECIAL_ERROR" "$tmp/out.txt"; then
  echo "log_search.sh did not find the injected log entry"
  cat "$tmp/out.txt"
  exit 1
fi

echo "ok: test_log_search found external log via custom config"

# Also ensure directory-only entries are recursed (no ** glob).
plain_dir="$tmp/plain_dir"
mkdir -p "$plain_dir/sub"
echo "PLAIN_DIR_MATCH" >"$plain_dir/sub/dir.log"

cat >"$cfg" <<EOF
- $plain_dir
EOF

if LOG_SOURCES_FILE="$cfg" "$ROOT/scripts/log_search.sh" "PLAIN_DIR_MATCH" >"$tmp/out2.txt"; then
  if ! grep -q "PLAIN_DIR_MATCH" "$tmp/out2.txt"; then
    echo "log_search.sh failed to find entry when config listed a directory without a glob"
    cat "$tmp/out2.txt"
    exit 1
  fi
else
  echo "log_search.sh exited nonzero for directory-only source"
  cat "$tmp/out2.txt"
  exit 1
fi

echo "ok: test_log_search recurses directory-only sources"
