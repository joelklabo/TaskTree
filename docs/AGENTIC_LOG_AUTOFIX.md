# Log-triggered agentic autofix reference

This document captures the current log-triggered agent flow we added as a reference for wiring agentic features into a codebase with TaskTree. It is intentionally small and TTD-backed.

## What it does
- Polls one or more log files for error-like patterns.
- On the first match per interval, builds a context payload (file, line, pattern, surrounding lines).
- Invokes a TaskTree flow (`log_error_handler`) that asks an agent to plan, implement, and test a fix.

## Components
- `backend/tasktree/log_watcher.py`: polling tailer that emits `LogEvent` when regexes match.
- `backend/tasktree/log_trigger.py`: couples the watcher to a flow runner; supports rate limiting, context lines, dry-run, and local logging.
- Flow glue: `backend/tasktree/config/flows/log_error_handler.yaml` (copilot_cli plan/implement/test stub).
- Scripts: `scripts/watch_logs.sh` (plain shell runner) and `make log-watch` / `make tmux-log-watch` helpers.
- Docs: `docs/LOG_TRIGGER.md` (CLI options, tests, tmux helper).

## TTD so far
- Failing/guard tests first: `backend/tests/test_log_watcher.py`, `test_log_trigger.py`, `test_log_trigger_context.py`.
- Smallest code to go green: watcher offsets + trigger context handling.
- Traceability: flow is ready to run under the trace wrapper (`uv run -m tasktree.agents.trace.record ...`) to capture trace.jsonl and artifacts.

## Try it locally
From repo root:
```bash
# Option A: simple dry-run
make log-watch DRY_RUN=1 LOG_PATH=tmp/dev-app.log PATTERNS="ERROR"

# Option B: tmux helper (opens window; override env as needed)
make tmux-log-watch LOG_PATH=tmp/dev-app.log PATTERNS="ERROR" CONTEXT_LINES=3
```
Then append a fake error to the watched log (separate shell):
```bash
echo "ERROR demo failure" >> tmp/dev-app.log
```
You should see a trigger log entry (and, if not dry-run, a `tt run log_error_handler --input ...` invocation).

## Running real agent flow
- Default flow: `log_error_handler` with `copilot_cli` stub actions (plan_bugfix → implement_fix → run_tests).
- To exercise the full agent stack with traces:
  ```bash
  cd backend
  uv run -m tasktree.agents.trace.record \
    uv run tasktree.log_trigger --paths ../tmp/dev-app.log --flow-id log_error_handler \
    --patterns "ERROR" --context-lines 3
  ```
  Then inject an error line; inspect the generated trace run under `backend/tasktree/agents/trace/runs/`.
- Watcher-driven example (already run): `backend/tasktree/agents/trace/runs/2025-11-21T05:47:39Z_31996/` captures a live trigger from `tmp/dev-app.log` when `ERROR watcher-driven failure demo` was appended. Input includes surrounding context lines; artifacts show the prompts/responses for assess/implement/test.

## Adapting to your app
- Point `--paths` (or `LOG_PATH`) at your app/server log.
- Add pattern presets (HTTP 500, stack traces) or swap in an allowlist for specific sources.
- Customize the flow id to route errors to specialized agents (e.g., frontend vs backend log handlers).
- Wire the flow’s `resources` to the code areas the agent should touch.
- Harden implement prompt to tolerate missing `input.plan.summary` (now falls back to generic instructions).
- If using another agent backend, swap `log_error_handler`’s agent or prompt map to match your tool (Copilot CLI, Codex CLI, Claude, etc.).

## Next steps (if we extend)
- Add glob support for multiple logs and pattern presets.
- Emit artifacts with the matched snippet + context in the flow trace.
- Plug into CI to replay the same flow against stored logs.
