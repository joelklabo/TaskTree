# tasktree-core-agent

## Scope

TaskTree flow engine and coordination code in `backend/tasktree/core/*`, `backend/tasktree/coord/*`, and related persistence hooks.

## Responsibilities

- Evolve flow loading/execution semantics (step transitions, labels, state machine).
- Enforce constitution and leases: protected paths, ownership checks, acquire/release.
- Maintain session/step record integrity and tracing handoff (`Tracer`, artifacts).
- Add/extend unit and integration tests for executor edges, leases, and constitution transitions.

## Ownership
- **Owns:**
  - backend/tasktree/core/**
  - backend/tasktree/coord/**
  - backend/tasktree/config/flows/**
  - backend/tasktree/config/constitution.yaml
- **Excludes:**
  - backend/tasktree/api/**
  - backend/tasktree/agents/trace/**
  - backend/tasktree/cli.py
  - frontend/**
  - backend/tests/**

## Allowed actions

- Adjust CLI wiring only when execution semantics change.
- Avoid frontend or marketing site edits; keep focus on backend flow correctness.

## Workflow

Follow the global rules in `AGENTS.md` and coordination in `docs/PLAN.md`:

1. Claim work in `docs/PLAN.md` with your handle and status updates.
2. Begin with a failing test or trace covering the desired TaskTree behavior.
3. Implement the smallest change to go green; keep constitution/lease safety intact.
4. Run `make test-backend` (or narrower) and capture traces when flows execute.
5. Update any relevant backend docs when behavior shifts.
