# Repository compression policy

Use this policy when creating a lean archive for code review or handoff. It mirrors the previous plan document and the behavior of `scripts/zip_repo.sh`.

## Command

- Run `make zip` (wraps `scripts/zip_repo.sh`). Default output: `/tmp/tasktree-code-<timestamp>.zip`.
- Optional flags (pass through to the script):
  - `--out PATH` – custom destination
  - `--keep-logs` – include `logs/`
  - `--keep-node-modules` – include `frontend/node_modules/`
  - `--keep-bin` – include `.bin/`
  - `--copy-path` – copy the resulting path to clipboard (best effort)

## Default contents

- All tracked and unignored files (respects `.gitignore`, includes untracked-but-not-ignored files).
- Source/config/docs/tests: `backend/`, `frontend/src/`, `scripts/`, `config/`, `agents/`, `docs/`, `Makefile`, `README.md`, `AGENTS.md`, dependency manifests (`frontend/package.json`, `backend/pyproject.toml`, `backend/uv.lock`, etc.).

## Excluded by default (size-heavy)

- `frontend/node_modules/`
- `logs/` (tmux panes, alerts, captures, etc.)
- `.bin/` tool binaries
- Build and cache outputs: `frontend/dist/`, `frontend/coverage/`, `frontend/playwright-report/`, `frontend/test-results/`, `frontend/.vite/`, `__pycache__/`, `.pytest_cache/`, `.ruff_cache/`, `.mypy_cache/`, `.venv/`
- Large single binaries (e.g., `.bin/shellcheck`)
- Repo metadata: `.git/`, `.tmux/`, `.DS_Store`

## Optional exclusions (omit unless explicitly needed)

- `.github/` workflows
- Non-tmux log files under `logs/*.log`
- `frontend/package-lock.json` (keep for reproducibility unless size constrained)

## Validation

- `scripts/tests/test_zip_repo.sh` validates the archive builds and stays under a sane size limit; it runs via `make test-scripts` and as part of `make test`.
