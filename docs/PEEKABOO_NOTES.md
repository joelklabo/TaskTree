# Peekaboo capture notes

- CLI path: export `PEEKABOO_BIN` to the installed binary (e.g., `/opt/homebrew/bin/peekaboo` from Homebrew). Defaults to `peekaboo` on PATH.
- Helper: `scripts/peekaboo_capture.sh <output.png> [--describe]` (uses Peekaboo if present; falls back to a dry note when missing). Set `PEEKABOO_DRY_RUN=1` to skip real captures locally.
- Playwright: failures automatically call the helper and attach the artifact in the test output directory. No action needed when Peekaboo is unavailable—the helper writes a skip note instead.
- CI hygiene: keep captures in `frontend/test-results/` via Playwright output and upload as artifacts when available.
- Trace artifacts: set `TASKTREE_TRACE_RUN_ID` to also copy captures into `backend/tasktree/agents/trace/runs/<run-id>/artifacts/peekaboo/` (override the root via `TASKTREE_TRACE_ROOT`); otherwise artifacts stay under `frontend/test-results/peekaboo/`.
