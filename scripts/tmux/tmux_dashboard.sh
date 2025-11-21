#!/usr/bin/env bash

# Create/attach to a tmux dashboard session with panes for status, plan, traces, logs, and servers.

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: tmux_dashboard.sh [--session NAME] [--no-attach] [--smoke]
  --session|-s   Session name (default: ttx)
  --no-attach    Do not attach after creating; useful for headless checks
  --smoke        Use short-lived dummy commands instead of real dev servers (for CI/headless smoke)
EOF
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SESSION="ttx"
ATTACH=1
SMOKE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
  --session | -s)
    SESSION="$2"
    shift 2
    ;;
  --no-attach)
    ATTACH=0
    shift
    ;;
  --smoke)
    SMOKE=1
    shift
    ;;
  --help | -h)
    usage
    exit 0
    ;;
  *)
    echo "Unknown argument: $1"
    usage
    exit 1
    ;;
  esac
done

if ! command -v tmux >/dev/null 2>&1; then
  echo "tmux is not installed; please install tmux first."
  exit 1
fi

LOG_DIR="$ROOT/logs"
TMUX_LOG_DIR="$LOG_DIR/tmux/$SESSION"
mkdir -p "$LOG_DIR" "$TMUX_LOG_DIR" "$LOG_DIR/tmux/resurrect"
touch "$TMUX_LOG_DIR/dashboard-status.log" "$TMUX_LOG_DIR/dashboard-plan.log" "$TMUX_LOG_DIR/dashboard-traces.log" "$TMUX_LOG_DIR/dashboard-logs.log" "$TMUX_LOG_DIR/tui.log"
LOG_SOURCES_FILE="${LOG_SOURCES_FILE:-$ROOT/logs/log_sources.yaml}"
STATE_FILE="$ROOT/tmp/dashboard_state.json"
mkdir -p "$ROOT/tmp"

# Plugin path is project-local; TPM bootstrap handled by scripts/tmux_plugins.sh.
export TMUX_PLUGIN_MANAGER_PATH="${TMUX_PLUGIN_MANAGER_PATH:-$ROOT/.tmux/plugins}"
mkdir -p "$TMUX_PLUGIN_MANAGER_PATH"
LOCAL_CONF="$ROOT/.tmux.local.conf"

# Ensure the server is running and has our local config loaded (even if another tmux server was
# already started without it).
tmux start-server
SOURCE_LOG="/tmp/tmux-source-${SESSION}.log"
tmux source-file "$LOCAL_CONF" 2>"$SOURCE_LOG" || echo "WARN: tmux source-file $LOCAL_CONF failed (see $SOURCE_LOG)"

if tmux has-session -t "$SESSION" 2>/dev/null; then
  echo "Session already exists: $SESSION"
  if [ "$ATTACH" -eq 1 ]; then
    exec tmux attach -t "$SESSION"
  else
    exit 0
  fi
fi

echo "Creating tmux session '$SESSION' (root: $ROOT)"

# Start/update dashboard state collector (background). Avoid duplicates by matching dest path.
if ! pgrep -f "dashboard_collector.sh .*--dest $STATE_FILE" >/dev/null 2>&1; then
  COLLECT_OPTS=(--interval 5 --dest "$STATE_FILE")
  if [ "$SMOKE" -eq 1 ]; then
    COLLECT_OPTS+=(--smoke)
  fi
  nohup "$ROOT/scripts/tmux/dashboard_collector.sh" "${COLLECT_OPTS[@]}" >/tmp/tmux-collector-"$SESSION".log 2>&1 &
fi

BACKEND_CMD="$ROOT/scripts/tmux/dev_backend.sh"
FRONTEND_CMD="$ROOT/scripts/tmux/dev_frontend.sh"
SEARCH_CMD="$ROOT/scripts/tmux/log_search_repl.sh"
GIT_COMMITS_CMD="bash -lc '\"$ROOT/scripts/tmux/dashboard_loop.sh\" 10 \"$ROOT/scripts/tmux/git_commits_view.sh\"'"
GIT_STATUS_CMD="bash -lc '\"$ROOT/scripts/tmux/dashboard_loop.sh\" 7 \"$ROOT/scripts/tmux/git_status_view.sh\"'"
GIT_DIFF_CMD="bash -lc '\"$ROOT/scripts/tmux/dashboard_loop.sh\" 10 \"$ROOT/scripts/tmux/git_diff_view.sh\"'"
HELP_CMD="bash -lc '\"$ROOT/scripts/tmux/dashboard_loop.sh\" 15 bash -lc \"if [ -f docs/TMUX_HELP.txt ]; then cat docs/TMUX_HELP.txt; else echo \\\"Add docs/TMUX_HELP.txt\\\"; fi\"'"
ALERTS_CMD="bash -lc '\"$ROOT/scripts/tmux/dashboard_loop.sh\" 12 \"$ROOT/scripts/tmux/cache_wrapper.sh\" alerts \"$ROOT/scripts/tmux/log_alerts.sh\" --top 12 --recent 8'"
CI_INTERVAL="${CI_INTERVAL:-120}"
CI_CMD="bash -lc '\"$ROOT/scripts/tmux/dashboard_loop.sh\" ${CI_INTERVAL} \"$ROOT/scripts/tmux/cache_wrapper.sh\" ci \"$ROOT/scripts/tmux/ci_status.sh\"'"
# shellcheck disable=SC2016
SHARES_CMD='bash -lc '\''set +u; latest=""; mkdir -p logs/pane_shares; while true; do clear; echo "Pane shares (latest 20)"; ls -1t logs/pane_shares 2>/dev/null | head -n 20; echo; latest=$(ls -1t logs/pane_shares 2>/dev/null | head -n 1 2>/dev/null || true); if [ -n "$latest" ]; then echo "Latest: $latest"; echo "---"; tail -n 120 "logs/pane_shares/$latest" 2>/dev/null; fi; sleep 6; done'\'''
SOURCES_CMD="bash -lc '\"$ROOT/scripts/tmux/dashboard_loop.sh\" 10 \"$ROOT/scripts/tmux/log_sources_overview.sh\"'"
HEALTH_CMD="bash -lc '\"$ROOT/scripts/tmux/dashboard_loop.sh\" 15 \"$ROOT/scripts/tmux/health_check.sh\" \"${SESSION:-ttx}\"'"
if [ "$SMOKE" -eq 1 ]; then
  BACKEND_CMD="bash -lc 'while true; do echo [smoke backend]; sleep 5; done'"
  FRONTEND_CMD="bash -lc 'while true; do echo [smoke frontend]; sleep 5; done'"
  SEARCH_CMD="bash -lc 'while true; do echo \"Search pane (smoke)\"; echo \"pattern> \"; sleep 5; done'"
  GIT_COMMITS_CMD="bash -lc 'while true; do echo [smoke commits]; sleep 5; done'"
  GIT_STATUS_CMD="bash -lc 'while true; do echo [smoke status]; sleep 5; done'"
  GIT_DIFF_CMD="bash -lc 'while true; do echo [smoke diff]; sleep 5; done'"
  ALERTS_CMD="bash -lc 'CI_SMOKE=1 \"$ROOT/scripts/tmux/dashboard_loop.sh\" 6 \"$ROOT/scripts/tmux/cache_wrapper.sh\" alerts \"$ROOT/scripts/tmux/log_alerts.sh\" --top 4 --recent 4'"
  CI_CMD="bash -lc 'CI_SMOKE=1 \"$ROOT/scripts/tmux/dashboard_loop.sh\" 12 \"$ROOT/scripts/tmux/cache_wrapper.sh\" ci \"$ROOT/scripts/tmux/ci_status.sh\"'"
  HELP_CMD="bash -lc 'while true; do echo [smoke help]; sleep 5; done'"
  SHARES_CMD="bash -lc 'while true; do echo [smoke shares]; sleep 5; done'"
  SOURCES_CMD="bash -lc 'while true; do echo [smoke sources]; sleep 5; done'"
  HEALTH_CMD="bash -lc 'while true; do echo [smoke health]; sleep 5; done'"
fi

tmux new-session -d -s "$SESSION" -c "$ROOT" -n dashboard "DASHBOARD_STATE=\"$STATE_FILE\" $ROOT/tui/cmd/ttx-dashboard/ttx-dashboard"
DASH_PANES=()
while IFS= read -r p; do DASH_PANES+=("$p"); done < <(tmux list-panes -t "$SESSION:dashboard" -F '#{pane_id}')
STATUS_PANE="${DASH_PANES[0]:-}"
tmux select-pane -t "$STATUS_PANE" -T "dashboard" || true

# Servers window: backend + frontend dev servers with logging + stamps.
tmux new-window -t "$SESSION" -c "$ROOT" -n servers
tmux send-keys -t "$SESSION:servers" "$BACKEND_CMD" C-m
tmux split-window -h -t "$SESSION:servers" -c "$ROOT" "$FRONTEND_CMD"
tmux select-layout -t "$SESSION:servers" even-horizontal
SERVER_PANES=()
while IFS= read -r p; do SERVER_PANES+=("$p"); done < <(tmux list-panes -t "$SESSION:servers" -F '#{pane_id}')
SERVER_BACK="${SERVER_PANES[0]:-}"
SERVER_FRONT="${SERVER_PANES[1]:-}"
tmux select-pane -t "$SERVER_BACK" -T "backend" || true
tmux select-pane -t "$SERVER_FRONT" -T "frontend" || true

# Logs window: follow backend + frontend logs with a couple lines of history.
tmux new-window -t "$SESSION" -c "$ROOT" -n logs
tmux send-keys -t "$SESSION:logs" "tail -n 80 -F logs/backend-dev.log" C-m
tmux split-window -v -t "$SESSION:logs" -c "$ROOT" "tail -n 80 -F logs/frontend-dev.log"
tmux select-layout -t "$SESSION:logs" even-vertical
LOG_PANES=()
while IFS= read -r p; do LOG_PANES+=("$p"); done < <(tmux list-panes -t "$SESSION:logs" -F '#{pane_id}')
LOG_BACK="${LOG_PANES[0]:-}"
LOG_FRONT="${LOG_PANES[1]:-}"
tmux select-pane -t "$LOG_BACK" -T "backend-log" || true
tmux select-pane -t "$LOG_FRONT" -T "frontend-log" || true

# Shells for ad-hoc commands.
tmux new-window -t "$SESSION" -c "$ROOT/backend" -n backend
tmux select-pane -t "$SESSION:backend.0" -T "backend-shell" || true
tmux new-window -t "$SESSION" -c "$ROOT/frontend" -n frontend
tmux select-pane -t "$SESSION:frontend.0" -T "frontend-shell" || true
tmux new-window -t "$SESSION" -c "$ROOT" -n root
tmux select-pane -t "$SESSION:root.0" -T "root-shell" || true
tmux new-window -t "$SESSION" -c "$ROOT" -n search "$SEARCH_CMD"
SEARCH_PANE=$(tmux list-panes -t "$SESSION:search" -F '#{pane_id}' | head -n1)
tmux select-pane -t "$SEARCH_PANE" -T "search" || true

tmux new-window -t "$SESSION" -c "$ROOT" -n git "$GIT_COMMITS_CMD"
tmux split-window -h -t "$SESSION:git" -c "$ROOT" "$GIT_STATUS_CMD"
tmux split-window -v -t "$SESSION:git" -c "$ROOT" "$GIT_DIFF_CMD"
tmux select-layout -t "$SESSION:git" tiled
GIT_PANES=()
while IFS= read -r p; do GIT_PANES+=("$p"); done < <(tmux list-panes -t "$SESSION:git" -F '#{pane_id}')
GIT_COMM="${GIT_PANES[0]:-}"
GIT_STAT="${GIT_PANES[1]:-}"
GIT_DIFF="${GIT_PANES[2]:-}"
tmux select-pane -t "$GIT_COMM" -T "commits" || true
tmux select-pane -t "$GIT_STAT" -T "status" || true
tmux select-pane -t "$GIT_DIFF" -T "diff" || true

tmux new-window -t "$SESSION" -c "$ROOT" -n alerts "$ALERTS_CMD"
tmux select-pane -t "$SESSION:alerts.0" -T "alerts" || true
if [ -x "$ROOT/tui/cmd/ttx-dashboard/ttx-dashboard" ]; then
  tmux new-window -t "$SESSION" -c "$ROOT" -n tui "DASHBOARD_STATE=\"$STATE_FILE\" $ROOT/tui/cmd/ttx-dashboard/ttx-dashboard"
  tmux select-pane -t "$SESSION:tui.0" -T "tui" || true
fi
tmux new-window -t "$SESSION" -c "$ROOT" -n ci "$CI_CMD"
tmux select-pane -t "$SESSION:ci.0" -T "ci" || true
tmux new-window -t "$SESSION" -c "$ROOT" -n help "$HELP_CMD"
tmux select-pane -t "$SESSION:help.0" -T "help" || true
tmux new-window -t "$SESSION" -c "$ROOT" -n shares "$SHARES_CMD"
tmux select-pane -t "$SESSION:shares.0" -T "shares" || true
tmux new-window -t "$SESSION" -c "$ROOT" -n sources "$SOURCES_CMD"
tmux select-pane -t "$SESSION:sources.0" -T "sources" || true
tmux new-window -t "$SESSION" -c "$ROOT" -n health "$HEALTH_CMD"
tmux select-pane -t "$SESSION:health.0" -T "health" || true
ALERTS_PANE=$(tmux list-panes -t "$SESSION:alerts" -F '#{pane_id}' | head -n1)
HELP_PANE=$(tmux list-panes -t "$SESSION:help" -F '#{pane_id}' | head -n1)
SHARES_PANE=$(tmux list-panes -t "$SESSION:shares" -F '#{pane_id}' | head -n1)
SOURCES_PANE=$(tmux list-panes -t "$SESSION:sources" -F '#{pane_id}' | head -n1)
HEALTH_PANE=$(tmux list-panes -t "$SESSION:health" -F '#{pane_id}' | head -n1)
STATUS_PANE="${STATUS_PANE:-$ALERTS_PANE}"

# Pipe pane output to log files for later review.
tmux pipe-pane -t "$STATUS_PANE" -o "cat >> $TMUX_LOG_DIR/dashboard-status.log" || true
tmux pipe-pane -t "$STATUS_PANE" -o "cat >> $TMUX_LOG_DIR/dashboard-plan.log" || true
tmux pipe-pane -t "$STATUS_PANE" -o "cat >> $TMUX_LOG_DIR/dashboard-traces.log" || true
tmux pipe-pane -t "$STATUS_PANE" -o "cat >> $TMUX_LOG_DIR/dashboard-logs.log" || true
tmux pipe-pane -t "$SERVER_BACK" -o "cat >> $TMUX_LOG_DIR/server-backend.log" || true
tmux pipe-pane -t "$SERVER_FRONT" -o "cat >> $TMUX_LOG_DIR/server-frontend.log" || true
tmux pipe-pane -t "$LOG_BACK" -o "cat >> $TMUX_LOG_DIR/tail-backend.log" || true
tmux pipe-pane -t "$LOG_FRONT" -o "cat >> $TMUX_LOG_DIR/tail-frontend.log" || true
tmux pipe-pane -t "$SEARCH_PANE" -o "cat >> $TMUX_LOG_DIR/search.log" || true
tmux pipe-pane -t "$GIT_COMM" -o "cat >> $TMUX_LOG_DIR/git-commits.log" || true
tmux pipe-pane -t "$GIT_STAT" -o "cat >> $TMUX_LOG_DIR/git-status.log" || true
tmux pipe-pane -t "$GIT_DIFF" -o "cat >> $TMUX_LOG_DIR/git-diff.log" || true
tmux pipe-pane -t "$ALERTS_PANE" -o "cat >> $TMUX_LOG_DIR/alerts.log" || true
if tmux list-windows -t "$SESSION" -F '#{window_name}' | grep -qx tui; then
  tmux pipe-pane -t "$SESSION:tui.0" -o "cat >> $TMUX_LOG_DIR/tui.log" || true
fi
tmux pipe-pane -t "$SESSION:ci.0" -o "cat >> $TMUX_LOG_DIR/ci.log" || true
tmux pipe-pane -t "$HELP_PANE" -o "cat >> $TMUX_LOG_DIR/help.log" || true
tmux pipe-pane -t "$SHARES_PANE" -o "cat >> $TMUX_LOG_DIR/shares.log" || true
tmux pipe-pane -t "$SOURCES_PANE" -o "cat >> $TMUX_LOG_DIR/sources.log" || true
tmux pipe-pane -t "$HEALTH_PANE" -o "cat >> $TMUX_LOG_DIR/health.log" || true

# Seed status/plan/trace logs so tests see content even when TUI dashboard is primary.
LOG_SOURCES_FILE="$LOG_SOURCES_FILE" DASHBOARD_STATE="$STATE_FILE" "$ROOT/scripts/tmux/dev_status.sh" >>"$TMUX_LOG_DIR/dashboard-status.log" 2>&1 || true
DASHBOARD_STATE="$STATE_FILE" "$ROOT/scripts/tmux/plan_preview.sh" >>"$TMUX_LOG_DIR/dashboard-plan.log" 2>&1 || true
DASHBOARD_STATE="$STATE_FILE" "$ROOT/scripts/tmux/trace_status.sh" >>"$TMUX_LOG_DIR/dashboard-traces.log" 2>&1 || true

# Seed CI/alerts logs in smoke to avoid empty files before the panes render.
if [ "$SMOKE" -eq 1 ]; then
  CI_SMOKE=1 "$ROOT/scripts/tmux/cache_wrapper.sh" ci "$ROOT/scripts/tmux/ci_status.sh" >>"$TMUX_LOG_DIR/ci.log" 2>&1 || true
  CI_SMOKE=1 "$ROOT/scripts/tmux/cache_wrapper.sh" alerts "$ROOT/scripts/tmux/log_alerts.sh" --top 4 --recent 4 >>"$TMUX_LOG_DIR/alerts.log" 2>&1 || true
fi

# Seed logs with hints so overlay/help tests have content even if panes are quiet briefly.
echo "Shortcuts: Prefix+C/y capture | Prefix+T toast | Prefix+H health | Copy pane: Prefix+y | tmux attach -t $SESSION" >>"$TMUX_LOG_DIR/dashboard-status.log"
{
  echo "Copy pane: Prefix+y | Copy results: use search header command"
  echo "pattern> "
} >>"$TMUX_LOG_DIR/search.log"

"$ROOT/scripts/tmux_marker.sh" "$SESSION" >/dev/null 2>&1 || true

# Configure plugin persistence paths per session (resurrect/continuum).
tmux set-option -g @resurrect-dir "$ROOT/logs/tmux/resurrect"
tmux set-option -g @continuum-save-interval '15'
tmux set-environment -g PROJECT_ROOT "$ROOT"
tmux set-environment -g LOG_SOURCES_FILE "$LOG_SOURCES_FILE"

tmux select-window -t "$SESSION:dashboard"

if [ "$ATTACH" -eq 1 ]; then
  exec tmux attach -t "$SESSION"
else
  echo "Created session '$SESSION' (not attaching)."
fi
