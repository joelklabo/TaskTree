#!/usr/bin/env bash

# Ensure CI pane shows a recent run when gh is available (stubbed).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SESSION="ttx-ci-stub-$$"
TMPDIR="$(mktemp -d)"
trap 'tmux kill-session -t "$SESSION" >/dev/null 2>&1 || true; rm -rf "$TMPDIR"' EXIT

STUB_DIR="$TMPDIR/bin"
mkdir -p "$STUB_DIR"
cat >"$STUB_DIR/gh" <<'EOF'
#!/usr/bin/env bash
if [ "$1" = "auth" ] && [ "$2" = "status" ]; then
  exit 0
fi
if [ "$1" = "run" ] && [ "$2" = "list" ]; then
  cat <<'OUT'
stub-run-1   completed    success   main    123
stub-run-2   completed    failure   dev     124
OUT
  exit 0
fi
echo "unexpected gh args: $*" >&2
exit 1
EOF
chmod +x "$STUB_DIR/gh"

PATH="$STUB_DIR:$PATH" GH_BIN="$STUB_DIR/gh" CI_INTERVAL=2 "$ROOT/scripts/tmux_dashboard.sh" --session "$SESSION" --no-attach

CI_LOG="$ROOT/logs/tmux/$SESSION/ci.log"
tries=40
until grep -q "stub-run-1" "$CI_LOG" 2>/dev/null; do
  tries=$((tries - 1))
  if [ $tries -le 0 ]; then break; fi
  sleep 1
done

if ! grep -q "stub-run-1" "$CI_LOG" 2>/dev/null; then
  echo "CI pane did not render stub gh runs"
  cat "$CI_LOG" || true
  exit 1
fi

echo "ok: test_ci_pane_with_gh_stub (expected to fail until GH_BIN respected in tmux ci pane)"
