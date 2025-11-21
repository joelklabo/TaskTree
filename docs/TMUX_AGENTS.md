# Tmux dashboard discoverability (agents)

Preferred name: **tmux dashboard** (session default: `ttx`).

## Attach info
- Marker file: `logs/dashboard_session.txt` (session name, attach command, launcher).
- Attach directly: `tmux attach -t ttx`
- Launch if missing: `./scripts/tmux_dashboard.sh --session ttx`
- Logs: `logs/tmux/ttx/` (pane logs), `logs/pane_shares/` (captures), `logs/log_sources.yaml` (search sources).

## Make targets
- `make tmux` — launch dashboard (`ttx`).
- `make tmux-info` — print session/attach/help info (TODO).
- `make tmux-smoke` / `make tmux-e2e` — smoketest/e2e.

## Agent hooks (ideas)
- Read `logs/dashboard_session.txt` to know where to attach.
- Read pane logs under `logs/tmux/<session>/` to summarize status/logs/search/alerts/help.
- Use `scripts/log_search.sh` / `scripts/log_alerts.sh` (read-only) to answer queries.
- Capture pane via `scripts/share_pane.sh` for context (or parse files in `logs/pane_shares/`).
