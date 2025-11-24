## Agent Execution & Safety Refactor Plan (TTD)

- [x] **Baseline**: Inspect current `codex_cli` flow, note execution touch points, and choose minimal guardrails to port (timeouts, allow/deny, safe rm/find) without Bun deps.
- [x] **CommandRunner helper**: Add shared runner in Python with tests covering allow/deny, dry-run, timeout, and safe-delete behavior; wire tracing hooks for decisions.
- [x] **Response validation**: Introduce JSONSchema-backed validator for agent outputs (status/label/commands/metrics/learnings) with unit tests for good/bad payloads.
- [x] **LLM backend adapter**: Support API and external CLI backends; tests for parsing CLI JSON/stdout errors; keep streaming/tool-calls optional for now.
- [x] **Refactor codex_cli**: Swap to the new base/runner/validator, keep existing prompts/config; add config toggles (execute_commands, allowlist/denylist, timeout_sec, dry_run, backend choice).
- [x] **Tracing**: Emit prompt/raw/parsed/command-run decisions into trace artifacts; update `trace.jsonl` schema/docs if needed.
- [x] **Docs**: Update README/AGENTS notes to describe the shared runner/validator/backends and how to configure them.
- [x] **Tests**: Run targeted suites (`make lint-backend test-backend`); document any skips/gaps per TTD.

### Baseline notes
- `codex_cli` executes suggested commands in `_maybe_run_commands` via `subprocess.run(shell=True)` without timeouts or safety checks; dry-run is the only guard.
- No shared command utility; parsing/validation is minimal `json.loads` with no schema enforcement.
- Tracing writes only a summary artifact; commands/decisions aren’t recorded in trace events.
