# CI watcher/dashboard plan (GitHub Actions)

Goal: add a CI pane that watches the latest GitHub Actions runs for this repo (`joelklabo/TaskTree`), surfaces status history, and alerts on failures while caching output to avoid flicker/emptiness. TTD: write failing tests first, then implement.

## Tests to add (fail first)
- `scripts/tests/test_ci_pane_missing.sh`: start a smoke session; assert a `ci` pane log exists (e.g., `logs/tmux/<session>/ci.log`) and contains a header like “CI builds”. Fails now because no CI pane/log.
- `scripts/tests/test_ci_recent_run.sh`: (later) mock or stub GH output to ensure the pane shows at least one recent run with status (green/red). Should fail until GH integration is added.
- `scripts/tests/test_ci_failure_alert.sh`: (later) simulate a failed run and assert the alerts/CI pane shows a failure marker and caches output if `gh` is unavailable.

## Implementation outline
1) Data source: use `gh run list -R joelklabo/TaskTree --limit 5 --json databaseId,headBranch,status,conclusion,workflowName,createdAt,updatedAt` (or similar) to fetch recent runs. Provide a fallback message if `gh` is missing.
2) Pane command: add a new window/pane `ci` that runs a small renderer (initially a simple script using `dashboard_loop.sh` to re-render every 5m with cached output; later, a BubbleTea/Textual TUI for smooth updates).
3) Caching: wrap CI fetch with `scripts/cache_wrapper.sh ci ...` to reuse the last snapshot on failures/no network.
4) Alerts hook: on a failed/latest run, emit a short “CI FAIL <workflow>#<run>” line to alerts (or a dedicated banner in the CI pane).
5) Styling: set pane title to “CI”; keep output compact (5 recent runs, colored status if possible). Use truecolor/emoji markers ✅/❌.
6) Optional TUI: implement a BubbleTea/Textual app that reads the GH JSON (or a local cache file) and renders a table without flicker; drop it in place of the looped script when ready.

## Triggering follow-up actions
- Polling: default every 5 minutes via `dashboard_loop.sh 300 ...`.
- Webhooks: if permitted, expose a simple endpoint to push updates to a cache file that the pane reads (stretch).
- On failure: run a hook script (e.g., `scripts/ci_failure_hook.sh`) to copy logs or capture pane/share and surface in alerts/shares.

## Notes
- Keep everything non-blocking in tmux panes (exit 0 on failures, show cached snapshots).
- Ensure `gh` auth is configured; otherwise, print a clear “gh not configured” message and rely on cache.
