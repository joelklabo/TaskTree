#!/usr/bin/env bash
set -euo pipefail

# Create an autolink reference, e.g., TRACE-123 -> link to a trace artifact path.
# Requires gh CLI authenticated with admin rights on the repo.

PREFIX=${PREFIX:-TRACE-}
TEMPLATE=${TEMPLATE:-""}
DESCRIPTION=${DESCRIPTION:-"Trace run link"}

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI is required (https://cli.github.com/)." >&2
  exit 1
fi

REPO=${REPO:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}
if [[ -z "$REPO" ]]; then
  echo "Could not determine REPO; set REPO=owner/name." >&2
  exit 1
fi

if [[ -z "$TEMPLATE" ]]; then
  TEMPLATE="https://github.com/${REPO}/tree/main/backend/tasktree/agents/trace/runs/<num>"
fi

echo "Creating autolink on ${REPO}: prefix=${PREFIX}, template=${TEMPLATE}"
gh api -X POST "repos/${REPO}/autolinks" \
  -f key_prefix="${PREFIX}" \
  -f url_template="${TEMPLATE}" \
  -F is_alphanumeric=true \
  -f description="${DESCRIPTION}"

echo "Done."
