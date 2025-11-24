# TaskTree CLI usage walkthrough

This walkthrough will live-read in CI to ensure the published CLI example stays runnable. The commands inside the tagged block should work from the repo root; we'll inject this into the README once it's stable.

<!-- tasktree-cli-usage:start -->

## List available flows

```sh
cd backend && uv run tt flows
```

## Run the code_fix flow

The `code_fix` flow takes a bug description and attempts to fix it:

```sh
cd backend && uv run tt run code_fix --input '{"bug_description": "Fix the failing test in test_leases.py"}'
```

## Run the log_error_handler flow

The `log_error_handler` flow autonomously handles errors detected in logs:
- **investigate**: Analyzes error and identifies root cause
- **implement**: Proposes and implements fix
- **test**: Runs tests to verify the fix

### Simple usage (mock responses for demo)

```sh
cd backend && uv run tt run log_error_handler --input '{"error_log": "TypeError in backend/tasktree/core/executor.py line 42"}'
```

### Real error handler demonstration

1. Start backend to trigger an error:

```sh
cd backend && uv run python -c "import requests; print(requests.get('http://localhost:8000/api/debug/trigger-error?error_type=type_error').json())" 2>/dev/null || echo "Backend not running - start with 'make dev-backend' in another terminal"
```

2. Parse and run the flow (simulated - actual log watcher would do this automatically):

```sh
cd backend && uv run tt run log_error_handler --input '{"error_log": "TypeError: unsupported operand type", "error_details": {"error_type": "TypeError", "error_message": "unsupported operand", "file_path": "routes_debug.py", "line_number": 22, "function_name": "calculate_total", "full_traceback": "See log for details", "context_before": [], "context_after": []}}'
```

## Tail logs from the CLI

List available log sources and tail one:

```sh
cd backend && uv run tt logs ls
cd backend && mkdir -p logs && echo "ERROR demo" >> logs/debug.log && uv run tt logs tail debug.log --lines 50 --contains ERROR
cd backend && uv run tt logs watch --sources debug.log,llm_transcript.log --contains ERROR --once
```

- `logs watch` streams via the TaskTree log API (no direct file tailing). Omit `--sources` to watch all discovered logs; use `--once` for a single pass (scripting/tests) and `--interval` to tune poll frequency.

### Retry logic demonstration

The flow supports automatic retries when tests fail:

```sh
cd backend && uv run tt run log_error_handler --input '{"error_log": "TypeError: test", "retry_count": 0, "max_retries": 2, "previous_attempts": []}'
```

Flow behavior:
- If tests pass: `investigate → implement → test → end`
- If tests fail: `investigate → implement → test → retry_or_triage → investigate` (with context from previous attempt)
- After max retries: `→ triage` (human review recommended)

### Real AI-powered error fixing with Codex

Use `codex` CLI as the LLM backend for real autonomous bug fixing:

```sh
cd backend && uv run python test_codex_integration.py
```

This demonstrates:
- Real AI analysis of errors
- Suggested fixes based on code context
- Command recommendations (grep, test commands)
- Fully autonomous when combined with log watcher

**Note**: The codex integration now calls the Codex CLI directly from Python (no shell wrapper required). `scripts/codex_wrapper.sh` remains as a legacy helper for older flows.

## Help and options

```sh
cd backend && uv run tt --help
```

```sh
cd backend && uv run tt run --help
```

<!-- tasktree-cli-usage:end -->

## Full autonomous cycle: Daemon log watcher

Run the log watcher in daemon mode to continuously monitor logs and automatically fix errors:

```bash
cd backend && uv run python -m tasktree.log_trigger --paths logs/backend-dev.log --patterns ERROR Traceback --dry-run
```

This demonstrates the complete autonomous cycle:
1. **Monitor**: Daemon watches `logs/backend-dev.log` for ERROR or Traceback patterns
2. **Detect**: When error found, extract and parse Python traceback
3. **Investigate**: AI analyzes error and identifies root cause
4. **Implement**: AI proposes and generates fix
5. **Test**: Run tests to verify fix
6. **Retry**: If tests fail, retry with context from previous attempt (max 2 retries)
7. **Triage**: After max retries, escalate to human review

**Using real AI (codex) with daemon:**

```sh
# 1. Switch to codex config
cd backend && ./scripts/use_codex.sh

# 2. Run daemon WITHOUT dry-run (real autonomous fixing!)
uv run python -m tasktree.log_trigger --paths logs/backend-dev.log --patterns ERROR Traceback

# 3. Trigger an error in another terminal
curl http://localhost:8000/api/debug/trigger-error?error_type=type_error

# 4. Watch the autonomous cycle in action!
# The daemon will detect, investigate, fix, and test automatically

# 5. Restore original config when done
./scripts/restore_default_agent.sh
```

**Stop daemon**: Press `Ctrl+C`
