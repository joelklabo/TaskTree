# tasktree-web-agent

## Scope

TaskTree FastAPI backend (`backend/tasktree/api/*`) and React + Vite frontend (`frontend/`), including the flow/traces UI.

## Responsibilities

- Add/modify HTTP routes and handlers; keep API contracts in sync with agents and flows.
- Serve/consume artifacts and trace data in the UI; ensure routing/state stays consistent.
- Implement or refine frontend pages/components (Flow list/detail, traces, artifacts).
- Write backend/ frontend tests (FastAPI clients, Vitest/Playwright) for new behavior.
- Preload UX for flow/traces: flows, traces, and dashboard state should auto-load on first render so users aren’t staring at skeletons forever (see tests below).

## Allowed actions

- Avoid changing CLI behavior unless the API requires parity updates.
- Avoid storage/constitution changes; coordinate with core agent when needed.

## Workflow

Follow the global rules in `AGENTS.md` and coordination in `docs/PLAN.md`:

1. Claim work in `docs/PLAN.md` with your handle and status updates.
2. Start with a failing API/UI test or reproduction; add fixtures for trace/artifact rendering.
3. Implement the smallest change across backend/frontend, keeping types and contracts aligned.
4. Run targeted checks (`make test-backend`, `make test-frontend`, `npm run e2e` when needed).
5. Update TaskTree docs and UI screenshots if behavior changes.

## Tests to add/keep green
- Vitest: flows/traces/dashboard should render when their fetches resolve; routing from path (`/dashboard`) should load the dashboard view.
- Playwright: traces tab shows existing traces; dashboard shows server/status cards; run detail shows trace/artifacts when available.
