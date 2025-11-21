# tasktree-debug-agent

## Scope

Tracing, logging, scenario IDs, and debug artifacts for TaskTree runs (`backend/tasktree/tracing.py`, `backend/tasktree/agents/trace/*`).

## Responsibilities

- Add/maintain tracing spans and fields for flows, agents, and leases; keep trace schema stable.
- Improve structured logs and correlation between API/CLI runs and stored traces.
- Refine trace recording/replay utilities and debug bundles for reproducing flow runs.

## Ownership

- **Owns:**
  - backend/tasktree/agents/trace/\*\*
  - backend/tasktree/tracing.py
- **Excludes:**
  - backend/tasktree/api/\*\*
  - backend/tasktree/core/\*\*
  - backend/tasktree/coord/\*\*
  - backend/tasktree/cli.py
  - frontend/\*\*
  - backend/tests/\*\*

## Allowed actions

- Adjust business semantics only when required for observability; avoid task ownership churn.
- Keep plan updates scoped to your tasks.

## Workflow

Follow the global rules in `AGENTS.md` and coordinate with `tasktree`:

1. Claim work from `tasktree` with your handle and status.
2. Start with a failing test or missing trace artifact; add fixtures for trace outputs.
3. Implement the minimal change, regenerate traces as needed, and validate against schema.
4. Run `make test-backend` (or focused tracing tests) and store artifacts when flows run.
5. Document new debugging steps or trace locations before closing the TaskTree task.
