# Peekaboo capture notes

- CLI path: export `PEEKABOO_BIN` to the installed binary (e.g., `/opt/homebrew/bin/peekaboo` from Homebrew). Defaults to `peekaboo` on PATH.
- Helper: `scripts/peekaboo_capture.sh <output.png> [--describe]` (uses Peekaboo if present; falls back to a dry note when missing). Set `PEEKABOO_DRY_RUN=1` to skip real captures locally.
- Playwright: failures automatically call the helper and attach the artifact in the test output directory. No action needed when Peekaboo is unavailable—the helper writes a skip note instead.
- CI hygiene: keep captures in `frontend/test-results/` via Playwright output and upload as artifacts when available.
