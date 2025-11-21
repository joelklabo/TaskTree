#!/usr/bin/env bash

# CI runs should be present in dashboard_state when gh output is available.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

STATE="$TMPDIR/state.json"

GH_STUB="$TMPDIR/gh"
cat >"$GH_STUB" <<'EOF'
#!/usr/bin/env bash
if [ "$1" = "run" ] && [ "$2" = "list" ]; then
  cat <<'JSON'
[
  {
    "databaseId": 123,
    "status": "completed",
    "conclusion": "success",
    "workflowName": "ci",
    "headBranch": "main",
    "event": "push",
    "createdAt": "2025-11-20T10:00:00Z",
    "updatedAt": "2025-11-20T10:05:00Z",
    "displayTitle": "CI success",
    "url": "https://example.com/run/123"
  }
]
JSON
  exit 0
fi
echo "unexpected gh stub args: $*" >&2
exit 1
EOF
chmod +x "$GH_STUB"

GH_BIN="$GH_STUB" SESSION="ci-tests" "$ROOT/scripts/tmux/dashboard_collector.sh" --once --dest "$STATE" || true

if ! jq -e '.ci.runs | length >= 1' "$STATE" >/dev/null 2>&1; then
  echo "ci.runs missing from dashboard_state"
  cat "$STATE" || true
  exit 1
fi

if ! jq -e '.ci.status=="success"' "$STATE" >/dev/null 2>&1; then
  echo "ci.status should reflect latest run conclusion"
  jq '.ci' "$STATE"
  exit 1
fi

run_branch="$(jq -r '.ci.runs[0].branch' "$STATE")"
run_url="$(jq -r '.ci.runs[0].url' "$STATE")"
if [ "$run_branch" != "main" ] || [[ "$run_url" != https://example.com/* ]]; then
  echo "ci run fields not captured correctly"
  jq '.ci.runs[0]' "$STATE"
  exit 1
fi

echo "ok: test_dashboard_state_ci_runs (expected to fail until gh parsing added)"
