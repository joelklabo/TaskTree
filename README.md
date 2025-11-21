# TaskTree

TaskTree is a scaffold for running simple, traceable task DAGs with agents. This repo includes:
- A FastAPI backend with a flow executor, tracing, and a stub copilot agent.
- A React + Vite frontend for browsing flows and traces.
- Make targets plus CI wiring for uv + Node, aligned with local tooling (same commands locally and in CI).

<!--status:start-->
| Check | Status |
| --- | --- |
| CI | ![CI](https://img.shields.io/github/actions/workflow/status/joelklabo/TaskTree/ci.yml?branch=main&label=ci) |
| Pages | ![Pages](https://img.shields.io/github/actions/workflow/status/joelklabo/TaskTree/pages.yml?branch=main&label=pages) |
| CodeQL | ![CodeQL](https://img.shields.io/github/actions/workflow/status/joelklabo/TaskTree/codeql.yml?branch=main&label=codeql) |
| Security | ![Security](https://img.shields.io/github/actions/workflow/status/joelklabo/TaskTree/security.yml?branch=main&label=security) |
<!--status:end-->

## CI timing history
Latest CI runtime splits (auto-updated on successful pushes to `main`):

![CI timing trend](docs/ci-timings.svg)

Raw history lives in `metrics/ci_timings.jsonl` and includes per-job/step durations for each run.

## Getting started
```
make setup
make dev
```
Backend runs on port 8000; frontend on 5173 with `/api` proxied to backend.
Quick make targets:

| Scenario | Backend | Frontend | Tools/notes | All-in-one |
| --- | --- | --- | --- | --- |
| Fresh setup (full) | `make setup-backend` | `make setup-frontend` | `make setup-tools` (shfmt/shellcheck) | `make setup` |
| Fresh setup (skip tools) | `make setup-backend` | `make setup-frontend` | — | `make setup-fast` |
| Format | `make format-backend` | `make format-frontend` | — | `make format` |
| Lint | `make lint-backend` | `make lint-frontend` | `make lint-shfmt` / `make lint-shellcheck` | `make lint` |
| Test | `make test-backend` | `make test-frontend` | — | `make test` |
| Coverage | `make coverage-backend` | `make coverage-frontend` | — | `make coverage` |
| Build | `make build-backend` | `make build-frontend` | — | `make build` |
| Dev servers | `make dev-backend` | `make dev-frontend` | — | `make dev` (both) |
| Scripts checks | — | — | `make verify-scripts` (shellcheck + tmux smokes) | — |
| Dashboard | — | — | `make tmux` (session ttx) / `make tmux-info` | — |

Notes: `make ci` runs lint + test + build. `make setup-tools` installs shfmt/shellcheck into `.bin/` (PATH). For E2E only: `make test-e2e` (frontend Playwright).

### Log-triggered agent (local)
- Watch a log and kick off a flow when an error appears:
  - `uv run tasktree.log_trigger --paths tmp/dev-app.log --patterns "ERROR" "Exception" --flow-id log_error_handler`
  - Add `--dry-run` to observe without running the flow; `--min-interval 30` rate-limits per file.
- Flow config: `backend/tasktree/config/flows/log_error_handler.yaml` (copilot_cli stub).
- Details: `docs/LOG_TRIGGER.md`.

### Developer workflow (TTD-first)
- Favor a **TTD loop**: write or update a failing test/trace, make the smallest change, re-run `make lint test`, update docs, commit.
- Use `make format` to apply Ruff/Prettier before committing.
- Capture flow runs with the trace wrapper to keep artifacts reproducible.
- For commits, install hooks (`bash scripts/git_hooks/install_hooks.sh`) and use `scripts/runner.sh "<message>"` (serializes commits, rebases on origin/<branch>, runs `make test` by default; set `RUNNER_TARGET=ci` to use the CI target).

## CLI
Within `backend/` you can run flows:
```
uv run tt flows
uv run tt run code_fix --input '{"bug_description": "example"}'
```

See `AGENTS.md` for agent guidelines and `backend/tasktree/config` for flows, prompts, and constitution.

## Docs & diagrams
- Keep high-level docs in `README.md` and detailed agent/process notes in `docs/`.
- Use Mermaid for diagrams where possible; keep source `.md/.mmd` files in `docs/mermaid/` (create as needed). See `docs/DIAGRAMS.md` for the render loop.
- Current diagram source: `docs/mermaid/flow-overview.mmd` (render to SVG/PNG via mermaid-cli).
- When behavior changes, update README and relevant docs in the same PR/commit to stay in sync.
- Tmux dev dashboard: `docs/TMUX_DASHBOARD.md` (see `scripts/tmux_dashboard.sh`, `scripts/tmux_dashboard_smoke.sh`, `scripts/tmux_plugins.sh`, `scripts/log_search.sh`, `scripts/refresh_tmux_dashboard.sh`, `scripts/tmux_refresh_smoke.sh`); agent-facing overview: `docs/TMUX_AGENTS.md`.
- Scripts: `make test-scripts` runs shellcheck (if installed) plus tmux smokes and the tmux e2e expect; `make tmux-e2e` runs the e2e only. `shfmt` is optional—install if you want POSIX shell formatting checks. Health/watchdog pane + on-demand check: see `docs/TMUX_DASHBOARD.md`. `make setup-tools` installs shfmt, shellcheck, and ripgrep into `.bin/`.
- Log sources config: `logs/log_sources.yaml` lists all globs searched by `log_search.sh`/alerts; defaults include repo logs, traces, and `~/.copilot/**/logs/**`; add entries for VS Code, Copilot CLI, Codex CLI, npm logs, etc.
- Log discovery/overview: `scripts/discover_logs.sh` suggests globs to add; `scripts/log_sources_overview.sh` summarizes counts/mtimes for configured sources.

## GitHub Pages & previews
- Marketing site lives in `site/` (bold gradient hero, stat cards, CTA) and publishes with the frontend build to GitHub Pages via `.github/workflows/pages.yml`.
- PRs touching `site/` or `frontend/` get a Pages preview comment with the preview URL; main publishes to the Pages environment.
- The app build is available under `/app/` on Pages; the marketing site is served at the root.

## ChatOps
- Slash commands on PRs: `/test backend|frontend|docs|all` triggers targeted runs via `manual-tests.yml`.
- Handy combos: `/test backend` before merging API changes, `/test frontend` after UI tweaks, `/test docs` for docs-only PRs to keep CI light, `/test all` before release tags.

## Releases
- Tag `v*.*.*` to run `release.yml`: builds backend wheel, frontend bundle, publishes GHCR image (keyless cosign + provenance), and uploads artifacts to the GitHub release.

## Tooling parity
- Python: `make lint-backend` runs `ruff check`, `mypy`, `bandit`, `yamllint`, `djlint`; `make test-backend` runs pytest with coverage.
- Frontend: `npm run lint`, `npm run typecheck`, `npm run format:check`; `npm run test` (Vitest unit), `npm run e2e` (Playwright); `npm run coverage` for unit coverage.
- CI runs the same commands split across backend/frontend/docs-shell jobs.

## E2E (Playwright)
- Backend must be running on :8000 (e.g., `make dev-backend`).
- Run `npm run e2e` from `frontend/` (Playwright config auto-starts a dev server on :5173 if needed and reuses an existing one).
- First time, install browsers: `cd frontend && npx playwright install chromium`.

## VS Code tips
- Recommended extensions are in `.vscode/extensions.json` (Python, Pylance, Ruff, ESLint, Prettier, GitHub Copilot/Copilot Chat).
- Settings in `.vscode/settings.json` enable format-on-save with Ruff for Python and Prettier for TS/TSX; ESLint is scoped to `frontend/`.
- After installing GitHub Copilot, sign in and enable for this workspace; pair it with the TTD loop (have it draft tests before code changes).
- Copilot Chat is useful for "why is this failing?"; include failing test output when you ask; always validate suggestions with `make lint test` before committing.

## Git hooks
- Install provided hooks with `bash scripts/git_hooks/install_hooks.sh`.
- Pre-commit runs `make ci` (lint/tests/build); set `SKIP_CI_HOOK=1` to skip temporarily.
- Commit-msg enforces non-empty subject <=72 chars; `SKIP_COMMIT_MSG_HOOK=1` to skip.
