# Workflows map

- `ci.yml` — orchestrator that fans out to backend/frontend/docs reusable workflows, uses path filters, caches, and posts summaries/PR comments.
- `backend.yml` — lint + mypy + bandit + yamllint + djlint; pytest with coverage + artifacts.
- `frontend.yml` — lint/typecheck/format, Vitest unit + coverage, Playwright e2e with cached browsers, build + artifacts.
- `docs.yml` — markdownlint, shellcheck, shfmt.
- `pages.yml` — builds marketing site (`site/`) + app (`frontend/dist`), publishes to Pages, comments preview links on PRs.
- `codeql.yml` — CodeQL for Python + JS on PRs, main, weekly.
- `security.yml` — SBOM (CycloneDX) + Trivy SARIF; weekly + PR/main.
- `release.yml` — tag-driven release skeleton: builds backend and frontend artifacts, uploads to Release.
- `labeler.yml` — applies path labels on PRs.
- `instructions.yml` — verifies `.github/copilot-instructions.md` references `AGENTS.md` and TTD expectations.
- `projects.yml` — adds opened issues/PRs to a Projects v2 board when `PROJECT_ID` repo/org variable is set.
- `manual-tests.yml` — workflow_dispatch for targeted test runs (backend|frontend|docs|all).
- `slash-commands.yml` — `/test <target>` on PR comments triggers `manual-tests.yml` with the selected target.
- `readme-status.yml` — verifies managed status block in README is up to date.
