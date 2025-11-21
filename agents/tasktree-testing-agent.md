# tasktree-testing-agent

## Scope

Test coverage and structure across TaskTree backend (`backend/tests`), frontend (`frontend/`), and supporting scripts.

## Responsibilities

- Add missing unit/integration tests for flows, agents, tracing, and API/CLI behaviors.
- Improve E2E/perf test harnesses (frontend Playwright, tmux smokes) and keep fixtures current.
- Refactor flaky or unclear tests; ensure coverage remains meaningful.

## Allowed actions

- Avoid introducing untested production code; everything should follow the TTD loop.

## Workflow

Follow the global rules in `AGENTS.md` and coordination in `docs/PLAN.md`:

1. Claim testing work in `docs/PLAN.md` with your handle and status.
2. Start from a failing test, missing assertion, or reproduced bug; then implement the fix.
3. Run the narrowest relevant targets (`make test-backend`, `make test-frontend`, `npm run e2e`) before merging.
4. Capture TaskTree traces or artifacts when test runs produce helpful diagnostics.
5. Document harness changes and any new commands required to run the suite.
