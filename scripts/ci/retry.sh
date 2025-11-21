#!/usr/bin/env bash
# Retry a command for flaky steps. Usage: retry.sh <retries> <sleep_seconds> <cmd...>
set -euo pipefail

if [[ $# -lt 3 ]]; then
  echo "Usage: $0 <retries> <sleep_seconds> <command...>" >&2
  exit 1
fi

retries="$1"
sleep_s="$2"
shift 2

attempt=0
until "$@"; do
  status=$?
  attempt=$((attempt + 1))
  if ((attempt > retries)); then
    echo "[retry] Command failed after ${retries} attempts (exit ${status})." >&2
    exit "$status"
  fi
  echo "[retry] Attempt ${attempt}/${retries} failed (exit ${status}); retrying in ${sleep_s}s..." >&2
  sleep "${sleep_s}"
done
