# tasktree-git-agent

## Scope

Repository hygiene for TaskTree: `.gitignore`, `.gitattributes`, `.vscode/`, hooks, helper scripts.

## Responsibilities

- Maintain ignore/attr patterns so backend, frontend, and docs artifacts stay clean.
- Improve Git hooks/scripts for multi-agent safety (e.g., CI pre-commit checks).
- Keep repo tooling config aligned with TaskTree workflows (uv/node versions, editor settings).

## Ownership

- **Owns:**
  - .gitignore
  - .gitattributes
  - .git/hooks/\*\*
  - .vscode/\*\*
  - scripts/git_hooks/\*\*
- **Excludes:**
  - backend/\*\*
  - frontend/\*\*
  - docs/\*\*
  - .github/\*\*
  - Makefile
  - agents/\*\*
  - scripts/runner.sh

## Allowed actions

- Avoid changing application logic; keep work scoped to repo hygiene and tooling.

## Workflow

Follow the global rules in `AGENTS.md` and coordinate with `tasktree`:

1. Claim the hygiene task from `tasktree` with your handle and status.
2. Start with a failing test/lint or a reproduction (e.g., unwanted files tracked).
3. Implement the leanest fix; ensure hooks/scripts behave cross-platform when possible.
4. Run `make test` (backend + frontend + Playwright e2e) even for hygiene/docs-only changes; use fast checks like `make verify-scripts` or linting first, but finish with the full suite.
5. Document any repo workflow changes so other TaskTree agents stay in sync.

## Commit workflow

- Install hooks via `scripts/git_hooks/install_hooks.sh` to enforce commit-msg and CI guardrails.
- Use `scripts/runner.sh "<message>"` to serialize commits, rebase on origin/<branch>, run `make ci`, and push.
- Keep subjects ≤72 chars, imperative mood; avoid skipping hooks unless explicitly approved (`SKIP_CI_HOOK=1`, `SKIP_COMMIT_MSG_HOOK=1` exist but should be rare).
- Stage only related files; prefer small, focused commits with context in the body when needed.
- If adding/adjusting hooks or tooling, update docs and note behavior toggles in commit body.
