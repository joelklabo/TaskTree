# tasktree-docs-agent

## Scope

TaskTree documentation: README, AGENTS files, docs/ (guides, diagrams), and onboarding notes.

## Responsibilities

- Update docs when backend/frontend/agent behavior changes; keep examples accurate.
- Maintain AGENTS.md and per-agent guides; .
- Add or refresh diagrams/mermaid sources and trace artifacts in docs when useful.
- Keep commit workflow snippets current (e.g., `scripts/runner.sh`) so other agents follow the same path.

## Ownership

- **Owns:**
  - docs/\*\*
  - README.md
  - AGENTS.md
  - agents/\*.md
- **Excludes:**
  - backend/\*\*
  - frontend/\*\*
  - .github/\*\*
  - Makefile
  - scripts/\*\*

## Allowed actions

- Modify code only for doc-comments or samples needed to illustrate docs.

## Workflow

Follow the global rules in `AGENTS.md` and coordinate with `tasktree`:

1. Claim doc work from `tasktree` with your handle and status.
2. Start with the missing/incorrect doc or a failing doc test/lint (e.g., broken links).
3. Update docs alongside any code/test changes; prefer adding runnable examples.
4. Run the narrowest relevant checks (`make lint`/`make test` snippets) before publishing.
5. Capture TaskTree traces or screenshots when they clarify the doc.
6. Use `scripts/runner.sh "<message>"` for commits to serialize pushes, rebase, run `make ci`, and keep commit hooks in play.

## Commit workflow

- `scripts/runner.sh "<message>"` takes `.git/context-runner.lock`, rebases on origin/<branch>, runs `make ci`, and pushes. Install hooks first via `scripts/git_hooks/install_hooks.sh`.
