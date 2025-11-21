#!/usr/bin/env bash

# Render recent GitHub Actions runs for this repo. Designed to be wrapped by cache_wrapper.sh.

set -euo pipefail

REPO="${GITHUB_REPO:-joelklabo/TaskTree}"
GH_BIN="${GH_BIN:-gh}"
LIMIT="${CI_LIMIT:-5}"
printf '\033]2;CI\007'

header() {
  printf "CI builds (GitHub Actions) for %s\n" "$REPO"
  printf "updated: %s\n\n" "$(date -Iseconds)"
}

gh_missing() {
  header
  echo "gh not installed or not on PATH; install GitHub CLI and authenticate to show CI runs."
  exit 0
}

if ! command -v "$GH_BIN" >/dev/null 2>&1; then
  gh_missing
fi

if [ "${CI_SMOKE:-0}" = "1" ]; then
  header
  echo "Smoke mode (no network):"
  for i in $(seq 1 "$LIMIT"); do
    echo "  - smoke-run-$i   status: completed   conclusion: success   branch: main"
  done
  exit 0
fi

if ! "$GH_BIN" auth status >/dev/null 2>&1; then
  header
  echo "gh auth not configured; run 'gh auth login' to enable CI polling."
  exit 0
fi

TMP_runs="$(mktemp)"
TMP_err="$(mktemp)"
trap 'rm -f "$TMP_runs" "$TMP_err"' EXIT

# gh run list returns a simple table; we keep it to avoid jq dependency.
if ! "$GH_BIN" run list -R "$REPO" --limit "$LIMIT" >"$TMP_runs" 2>"$TMP_err"; then
  header
  echo "gh run list failed: $(cat "$TMP_err" || true)"
  exit 0
fi

header
if [ ! -s "$TMP_runs" ]; then
  echo "No CI runs returned."
  exit 0
fi

echo "Recent runs (top $LIMIT):"
cat "$TMP_runs"

exit 0
