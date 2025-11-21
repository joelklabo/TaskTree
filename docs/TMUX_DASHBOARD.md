# Tmux dashboard

Project-local tmux dashboard for TaskTree with status, traces, logs, search, and server panes.

## Quick start

- Prereqs: `tmux`, `rg`, `python3` (or `python`/`uv`), project deps (`make setup`).
- Launch: `./scripts/tmux_dashboard.sh [--session NAME]` (default `ttx`).
- Stop: `tmux kill-session -t ttx` (or Prefix+`:` `kill-session`).
- Smoke-only: `./scripts/tmux_dashboard_smoke.sh` or `make tmux-smoke` (no servers, short-lived).

## Layout (created by `scripts/tmux_dashboard.sh`)

- `dashboard` window (auto-refresh):
  - Pane `status`: restart stamps (relative time), port listeners, git dirty count, log sizes, latest TaskTree traces.
  - Pane `traces`: latest trace runs from `backend/tasktree/agents/trace/runs`.
  - Pane `logs`: rolling tails of `logs/backend-dev.log` and `logs/frontend-dev.log`.
- `servers`: backend (`scripts/dev_backend.sh`) and frontend (`scripts/dev_frontend.sh`) with restart stamps + logging.
- `logs`: follows backend/frontend dev logs.
- `search`: interactive log search REPL (`scripts/log_search_repl.sh`, uses `rg` across `logs/` + trace runs; set `RG_ARGS` to add default filters).
- `git`: three panes — recent commits (oneline + relative date), `git status -sb`, and `git diff --stat` (all auto-refresh).
- `refresh` (binding only): inside tmux press `Prefix + R` to respawn all dashboard panes via `scripts/refresh_tmux_dashboard.sh`.
- `alerts`: ranked errors/warnings across logs + trace runs (`scripts/log_alerts.sh`, shows top + recent with copyable command hints). Patterns (ci): error, warn/ing, exception/traceback, deprecat(ed|ion), fail/failed/failure, fatal, panic, timeout/timed out, permission denied, connection refused, unavailable, throttle, oom.
- `sources`: overview of configured log sources (`logs/log_sources.yaml`) via `scripts/log_sources_overview.sh`.
- `health`: watchdog loop; also bound to `Prefix + H` for on-demand checks. Fails emit a tmux toast and append to `logs/tmux/<session>/health.log`.
- `help`: shortcut reference from `docs/TMUX_HELP.txt`.
- `shares`: list of captured panes (latest 20) and the latest capture content.
- `backend`, `frontend`, `root`: spare shells.

## Logging and stamps

- Dev server logs: `logs/backend-dev.log`, `logs/frontend-dev.log`.
- Pane outputs piped to `logs/tmux/<session>/...` for after-the-fact review (including the search pane).
- Restart stamps: `logs/backend-dev.last`, `logs/frontend-dev.last` (shown as “ago” in status pane).

## Plugins (TPM, resurrect/continuum)

- Project-local tmux config: `.tmux.local.conf` (sources `~/.tmux.conf` if present).
- TPM bootstrap/update: `./scripts/tmux_plugins.sh` (installs into `.tmux/plugins/`).
- Plugins enabled: `tmux-resurrect` + `tmux-continuum` (autosave every 15m; restore with Prefix+Ctrl-r, save with Prefix+Ctrl-s).
- Plugin state stored under `logs/tmux/resurrect`.

## Mouse

- Mouse is **on** by default so scroll/selection stays in tmux (avoids escape noise in panes). Toggle with `Prefix + m` if you want it off, then back on to re-capture the mouse.

## Searches

- One-shot CLI: `./scripts/log_search.sh "<pattern>" [-- <extra rg args>]` (searches configured log sources).
- In-dashboard: use the `search` window (REPL); `RG_ARGS='-g*.jsonl' ./scripts/tmux_dashboard.sh` pre-sets filters.
- Log sources: configured in `logs/log_sources.yaml` (globs, relative to repo root or absolute). Defaults cover `logs/**`, `backend/tasktree/agents/trace/runs/**`, and `~/.copilot/**/logs/**`; add entries for VS Code/Copilot/Copilot CLI/npm/etc as needed.
- Log discovery/overview: `scripts/discover_logs.sh` suggests globs to add; `scripts/log_sources_overview.sh` summarizes counts/mtimes (shown in the `sources` window).
- Alerts (errors/warnings): `scripts/log_alerts.sh --top 12 --recent 8` (in the `alerts` window). Uses the same sources file; prepend the runnable command to results.
- Alert patterns: configure `logs/alert_patterns.yaml` (or set `$ALERT_PATTERNS_FILE`) with rules:
  - `pattern`: regex fragment (ci).
  - `level`: critical|high|medium|low (groups + coloring).
  - `notify`: toast|bell|none.
  - `auto_capture`: save context to `logs/alert_captures/` when first hit after throttle.
  - `throttle`: seconds between alerts for the same rule.

## Health & automation

- Watchdog pane: always-on in the `health` window plus `Prefix + H` on-demand; writes failures to `logs/tmux/<session>/health.log` and shows a tmux toast.
- Refresh: `Prefix + R` or `scripts/refresh_tmux_dashboard.sh --session NAME` respawns the dashboard panes.
- Capture/share: `Prefix + C` or `Prefix + y` (or `scripts/share_pane.sh ...`) saves pane output + metadata to `logs/pane_shares/` and copies to the clipboard when available; latest captures surface in the `shares` window.
- Toast test: `Prefix + T` shows a tmux message immediately (sanity check for overlays).
- Theme: project tmux config enables TPM plugins (resurrect/continuum/prefix-highlight/tmux-power/catppuccin/fzf) using the repo-local `.tmux/plugins`. Run `./scripts/tmux_plugins.sh` once; theme can be tweaked via `.tmux.local.conf`.
- Tests: `make test-scripts` runs shellcheck, log-search test, tmux smokes, refresh smoke, and the tmux e2e expect script. `make tmux-e2e` runs the e2e only.

## Smoke check

- Headless layout/log sanity: `./scripts/tmux_dashboard_smoke.sh` (or `make tmux-smoke`). Creates a temp session with smoke commands, captures layout and pane logs under `logs/tmux/<session>/`, then cleans up.
- Pane refresh: `./scripts/refresh_tmux_dashboard.sh [--session NAME]` (or inside tmux, `Prefix + R`).
- Refresh smoke: `./scripts/tmux_refresh_smoke.sh` (or `make tmux-refresh-smoke`) ensures refresh script works on a running session, records window/pane lists, then cleans up.
- Capture/share panes: `Prefix + C` saves current pane to `logs/pane_shares/<ts>_...` (with metadata, pbcopy/xclip if available) and surfaces copies in the `shares` window.

## Customizing

- Session name: `./scripts/tmux_dashboard.sh --session mydash`.
- Ports/hosts: export `BACKEND_PORT`/`BACKEND_HOST` or `FRONTEND_PORT`/`FRONTEND_HOST` before launching.
- Add panes: edit `scripts/tmux_dashboard.sh` (e.g., DB logs, workers).
- Trace view: `scripts/trace_status.sh` pulls from `backend/tasktree/agents/trace/runs` (`meta.json` + timestamps). Copy/extend if you want richer parsing.
- Help pane: edit `docs/TMUX_HELP.txt` to change the on-dashboard shortcut list.
