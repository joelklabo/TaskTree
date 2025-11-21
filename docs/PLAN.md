# TaskTree Plan

- **Last updated:** 2025-11-21 (later updates should bump)
- **Method:** TTD loop (Test-first, Trace, Document), commit early/often. Update this file when tasks start/finish.

## How to use this plan
- Ownership: `docs/PLAN.md` is scribe-owned per constitution; only the scribe edits it. Others request updates from the scribe.
- Handle: colors = [red, blue, green, amber, teal, violet, gray]; idx = timestamp_seconds % len(colors); handle = colors[idx] + "-" + last4hex(timestamp_seconds).
- Task pickup: never ask humans which task to do—always select from this plan. After finishing a task, return here and pick the next open item; if none, stop per discover/wait rules.
- Claiming: when starting, add/move an item under “In Progress” with `[ ]`, your handle, start date, and a short note; bump “Last updated.” When done, move it to “Done” with `[x]`, owner, date, and notes.
- Workflow: stay in TTD—start from a failing test/repro, capture traces, document, and run `make test` (backend + frontend + Playwright e2e) before marking done.
- Completion: before moving an item to “Done,” commit and push via `scripts/runner.sh "<message>"` (or note the blocker here if you cannot); do not leave a finished task uncommitted.
- Blockers: add blockers with owner/ask under “Blockers”; remove when resolved.

## In Progress
- [ ] Trace detail UX: step timeline/cards + collapsible raw JSON; ensure Playwright + Vitest cover the structured view (web agent: red-0b2e) - started: 2025-11-21
- [ ] Constitution UI/API polish: render task states/ownership/protected paths from backend route with error/empty states; add Playwright check (web agent: red-0b2e) - started: 2025-11-21
- [ ] Flow graph layout: auto-fit nodes, visible start/end badges, non-empty render with tests (web agent: red-0b2e) - started: 2025-11-21
- [ ] Traces list UX: show flow name/label, add quick filter/search, and better empty/loading states (web agent: red-0b2e) - started: 2025-11-21
- [ ] Layout polish: ensure workspace content not cut off (footer padding/scroll), sticky tabs header, responsive spacing (web agent: red-0b2e) - started: 2025-11-21

## Done
- [x] Plan usage guidance and no-prompt/commit rules - owner: blue-96b1 - date: 2025-11-21 - notes: added “How to use this plan” section clarifying handle calc, no human task requests, and commit-before-done requirement (`scripts/runner.sh`).
- [x] Repo scaffold, lint/format configs, TTD docs, protected resource checks, basic tests - owner: assistant - date: 2025-11-20 - notes: backend/frontend skeleton, ruff/mypy/eslint/prettier, protected paths enforcement, smoke tests.
- [x] Artifacts listing API + UI surface - owner: assistant - date: 2025-11-20 - notes: backend endpoints to list/download artifacts; UI shows artifacts for runs.
- [x] Copilot CLI agent with prompts, mock responses, optional command execution, and unit tests - owner: assistant - date: 2025-11-20 - notes: prompt rendering, mock JSON parsing, dry-run/exec toggle.
- [x] Flow detail UX iteration - owner: assistant - date: 2025-11-20 - notes: flow graph display, artifacts list/download, traces listing and navigation to run view.
- [x] Expand tests: executor edge cases, leases renewals, constitution transitions - owner: assistant - date: 2025-11-20 - notes: added tests for missing flow/agent/transition, lease renewal/failure, constitution transitions.
- [x] Mermaid flow diagram source + placeholder render - owner: assistant - date: 2025-11-20 - notes: docs/mermaid/flow-overview.mmd and flow-overview.svg (placeholder; regenerate via mermaid-cli).
- [x] tmux dashboard docs - owner: assistant - date: 2025-11-20 - notes: docs/TMUX_DASHBOARD.md documents scripts/tmux_dashboard.sh usage and smoke.
- [x] Log-triggered agent flow scaffold - owner: assistant - date: 2025-11-21 - notes: `LogWatcher` + `log_trigger` CLI, `log_error_handler` flow, docs in README + docs/LOG_TRIGGER.md; tests cover watcher + trigger.
- [x] Agent docs guardrails + TaskTree naming + e2e dashboard stabilization - owner: red-0b2e - date: 2025-11-21 - notes: agent doc/test guard for tasktree-* naming, Playwright dashboard/routes stabilized, full test suite green.
- [x] Commit runner adopted from Context repo + frontend coverage boost - owner: red-0b2e - date: 2025-11-21 - notes: added scripts/runner.sh (locks `.git/context-runner.lock`, runs `make ci` before push), git agent/docs updated, coverage tests for flows/traces/run detail/API; full `make test` green.

## Blockers
- None noted. Add items here with owner/ask.

## Dashboard (tmux)
 - [ ] tmux dev dashboard (session `ttx`) with status, plan tail, trace view, log tails, search window, pane logging, TPM (resurrect/continuum) - owner: assistant - started: 2025-11-20 - notes: see scripts/tmux_dashboard.sh, .tmux.local.conf, docs/TMUX_DASHBOARD.md; smoke: `make tmux-smoke`.
 - [ ] TODO: hook smoke (`scripts/tmux_dashboard_smoke.sh` / `make tmux-smoke`) into CI or capture trace evidence after running locally; currently manual.

## Dashboard modernization (tmux/web)
 - [ ] Consolidate dashboard into shared DashboardState + TUI/Web view (BubbleTea + React), collector, and tmux as window manager - owner: assistant - started: 2025-11-20 - notes: see docs/TMUX_WEB_PLAN.md for TDD checklist and steps.
