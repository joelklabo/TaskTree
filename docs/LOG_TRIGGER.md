# Log-triggered agent flow (local)

This is an opt-in local helper that watches a log file for error lines and kicks off a TaskTree flow with the matching line as context.

## Run it
From `backend/` (or repo root):
```
uv run tasktree.log_trigger --paths tmp/dev-app.log --patterns "ERROR" "Exception" "Traceback" --flow-id log_error_handler --min-interval 30
```
- Default path: `tmp/dev-app.log` (safe to write during tests).
- Default flow: `log_error_handler` (copilot_cli stub steps).
- Rate limit: 30s per file (override with `--min-interval`).
- Dry-run: add `--dry-run` to just print matches.
- Context: add `--context-lines N` to include N lines before/after the match in the flow input and optional log output.
- Log destination: add `--log-dest path` to tee matches into a local log for debugging.

## How it works
- The watcher polls files (no inotify dependency) and keeps per-file offsets (handles truncation/rotation).
- On first matching line per interval, it passes `{file, lineno, line, pattern}` to `tt run <flow>` as JSON input.
- The flow is defined at `backend/tasktree/config/flows/log_error_handler.yaml` with plan/implement/test steps.

## Tests
- `make ci` covers:
  - `backend/tests/test_log_watcher.py`: emits event for error line.
  - `backend/tests/test_log_trigger.py`: runner invocation + rate limiting.
  - `backend/tests/test_log_trigger_context.py`: captures the surrounding context lines.

## tmux helper
- `make tmux-log-watch` opens a `log-watch` window (session `ttx` by default) that tails your chosen log and triggers flows.
- Override with env vars: `TMUX_SESSION`, `LOG_PATH`, `PATTERNS`, `FLOW_ID`, `MIN_INTERVAL`, `DRY_RUN`, `CONTEXT_LINES`, `LOG_DEST`.

## Next ideas
- Add a CLI flag for globbing multiple paths.
- Allow pattern presets (HTTP 500, stack traces).
- Capture a trace artifact with the around-context (N lines before/after) for debugging.
