# TaskTree compression plan (what to exclude)

Goal: produce a small archive for “code review” usage (logic/config/docs/tests only), without heavy binaries, caches, or build artifacts.

## Heavy items to exclude (definitely omit)
- `frontend/node_modules/` (~279 MB)
- `logs/tmux/` (~440 MB across sessions)
- `.bin/` (tool binaries; ~70 MB, e.g., shellcheck)
- `.git/` (~33 MB)
- `.tmux/` (~7 MB)
- `logs/alert_captures/`
- `logs/pane_shares/`
- `tmp/` (generated state/cache)
- `site/`, `metrics/` (artifacts)
- Build/output caches:
  - `frontend/dist/`, `frontend/coverage/`, `frontend/playwright-report/`, `frontend/test-results/`, `frontend/.vite/`
  - `__pycache__/`, `.pytest_cache/`, `.ruff_cache/`, `.mypy_cache/`, `.venv/`
- Large single binaries:
  - `.bin/shellcheck` (>50 MB)

## Optional exclusions (default omit, but can keep with a flag)
- Non-tmux logs (`logs/*.log`) if a lean archive is needed.
- `frontend/package-lock.json` (keep by default for reproducibility; drop only if size is a concern).
- `.github/` (keep by default; drop only if CI workflows aren’t needed for the recipient).

## What to include
- Source and config: `backend/`, `frontend/src/`, `scripts/`, `config/`, `agents/`
- Project roots: `Makefile`, `README.md`, `AGENTS.md`, `docs/`
- Dependency manifests: `frontend/package.json` (+ lock if desired), `backend/pyproject.toml`, `backend/uv.lock`, `mypy.ini`, `ruff.toml`, `.tmux.local.conf`, `.editorconfig`, `.gitignore`

## Command to use
- `make zip` -> runs `scripts/zip_repo.sh`, which:
  - Uses `git ls-files -co --exclude-standard` to list tracked + unignored files.
  - Writes `/tmp/tasktree-code-YYYYMMDD-HHMMSS.zip` by default (use `--out PATH` to change).
  - Optional flags: `--keep-logs`, `--keep-node-modules`, `--keep-bin` to force-add ignored dirs; `--copy-path` copies the zip path to clipboard when supported.
