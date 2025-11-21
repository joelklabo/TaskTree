# tasktree-docs-agent

## Scope

TaskTree documentation: README, AGENTS files, docs/ (guides, diagrams), and onboarding notes.

## Responsibilities

- Update docs when backend/frontend/agent behavior changes; keep examples accurate.
- Maintain AGENTS.md and per-agent guides; cross-link with `docs/PLAN.md`.
- Add or refresh diagrams/mermaid sources and trace artifacts in docs when useful.

## Allowed actions

- Modify code only for doc-comments or samples needed to illustrate docs.

## Workflow

Follow the global rules in `AGENTS.md` and coordination in `docs/PLAN.md`:

1. Claim doc work in `docs/PLAN.md` with your handle and status.
2. Start with the missing/incorrect doc or a failing doc test/lint (e.g., broken links).
3. Update docs alongside any code/test changes; prefer adding runnable examples.
4. Run the narrowest relevant checks (`make lint`/`make test` snippets) before publishing.
5. Capture TaskTree traces or screenshots when they clarify the doc.
