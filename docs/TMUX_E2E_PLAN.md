# tmux dashboard reliability plan

Goal: deterministic tmux e2e + continuous watchdog so every change to the dashboard is validated, and we can see/surface failures immediately.

## What runs when
- **E2E (tmux_e2e):** explicit target (`make tmux-e2e`) and included in `make test-scripts` (CI/local). Spins a fresh session, exercises keybindings, and asserts pane content.
- **Watchdog:** always-on pane/window in the live session (timer), plus `Prefix+H` to run on demand. Emits a toast + health log on failure.

## E2E flow (new script: `scripts/tmux_e2e_expect.sh`)
- Spin up temp session (smoke) with full layout.
- Assert windows/panes exist with expected titles: dashboard/servers/logs/search/git/alerts/help/shares/sources.
- Exercise keybindings: Prefix+R (refresh) and Prefix+C (capture) in controlled panes.
- Validate pane content via pipe logs:
  - status: contains “TaskTree dev status”
  - traces: contains “TaskTree traces”
  - alerts: contains “# Alerts”
  - sources: contains “Log sources overview”
  - shares: contains “Pane shares”
- Confirm a capture file is created in `logs/pane_shares/`.
- Tear down session; exit nonzero on any failure.

## Watchdog flow (new window/pane “health”)
- Timer loop (~15s) in live session:
  - Check pipe logs for stable headers (status/plan/traces/alerts/sources/shares).
  - Check expected windows exist.
  - Check `log_sources_overview.sh` returns ≥1 source.
- Failure: tmux toast (`display-message`) and append to `logs/tmux/<session>/health.log`. No auto-respawn.
- Keybinding: `Prefix+H` to trigger an immediate check.

## Checklist (implementation)
- [x] Add `scripts/tmux_e2e_expect.sh` with the e2e flow above.
- [x] Add `make tmux-e2e` target; call it from `make test-scripts`.
- [x] Add “health” window/pane to `tmux_dashboard.sh`, timer loop, and toast on failure; pipe to `health.log`.
- [x] Add `Prefix+H` binding to run the health check once.
- [x] Ensure existing smokes still green after changes.
- [x] Document usage in README and `docs/TMUX_DASHBOARD.md`.
- [x] Final manual validation: `make test-scripts` green, `make tmux-e2e` green, verify health pane toasts on forced failure and logs to `logs/tmux/<session>/health.log` (manual fail injection: `ttx-health` smoke session, missing windows; see `logs/tmux/ttx-health/health.log`).
