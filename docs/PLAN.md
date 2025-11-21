# TaskTree Plan

- **Last updated:** 2025-11-20 (later updates should bump)
- **Method:** TTD loop (Test-first, Trace, Document), commit early/often. Update this file when tasks start/finish.

## In Progress
- [ ] None currently (backlog empty; discover new work)

## Done
- [x] Repo scaffold, lint/format configs, TTD docs, protected resource checks, basic tests - owner: assistant - date: 2025-11-20 - notes: backend/frontend skeleton, ruff/mypy/eslint/prettier, protected paths enforcement, smoke tests.
- [x] Artifacts listing API + UI surface - owner: assistant - date: 2025-11-20 - notes: backend endpoints to list/download artifacts; UI shows artifacts for runs.
- [x] Copilot CLI agent with prompts, mock responses, optional command execution, and unit tests - owner: assistant - date: 2025-11-20 - notes: prompt rendering, mock JSON parsing, dry-run/exec toggle.
- [x] Flow detail UX iteration - owner: assistant - date: 2025-11-20 - notes: flow graph display, artifacts list/download, traces listing and navigation to run view.
- [x] Expand tests: executor edge cases, leases renewals, constitution transitions - owner: assistant - date: 2025-11-20 - notes: added tests for missing flow/agent/transition, lease renewal/failure, constitution transitions.
- [x] Mermaid flow diagram source + placeholder render - owner: assistant - date: 2025-11-20 - notes: docs/mermaid/flow-overview.mmd and flow-overview.svg (placeholder; regenerate via mermaid-cli).
- [x] tmux dashboard docs - owner: assistant - date: 2025-11-20 - notes: docs/TMUX_DASHBOARD.md documents scripts/tmux_dashboard.sh usage and smoke.

## Blockers
- None noted. Add items here with owner/ask.

## Dashboard (tmux)
 - [ ] tmux dev dashboard (session `ttx`) with status, plan tail, trace view, log tails, search window, pane logging, TPM (resurrect/continuum) - owner: assistant - started: 2025-11-20 - notes: see scripts/tmux_dashboard.sh, .tmux.local.conf, docs/TMUX_DASHBOARD.md; smoke: `make tmux-smoke`.
 - [ ] TODO: hook smoke (`scripts/tmux_dashboard_smoke.sh` / `make tmux-smoke`) into CI or capture trace evidence after running locally; currently manual.
