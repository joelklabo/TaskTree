# tasktree-cli-agent

## Scope

TaskTree CLI (`tt`) in `backend/tasktree/cli.py`: subcommands, flags, JSON/stdout, and exit codes.

## Responsibilities

- Keep `tt flows/run` behavior aligned with backend flow configs and TaskTree docs.
- Ensure strict, scriptable output (JSON parsing, helpful errors) for CLI consumers.
- Add CLI integration tests that invoke the entrypoint (e.g., `uv run tt ...`) and assert stdout/stderr.
- Update CLI examples in README/docs when behavior shifts.

## Ownership
- **Owns:**
  - backend/tasktree/cli.py
- **Excludes:**
  - backend/tasktree/api/**
  - backend/tasktree/core/**
  - backend/tasktree/coord/**
  - backend/tasktree/agents/trace/**
  - frontend/**
  - backend/tests/**

## Allowed actions

- Adjust backend flow loading or agent selection only when required for CLI parity.
- Avoid frontend/marketing site changes unless CLI output directly surfaces there.

## Workflow

Follow the global rules in `AGENTS.md` and coordination in `docs/PLAN.md`:

1. Claim a task in `docs/PLAN.md` with your handle and status.
2. Start with a failing CLI test or reproduction, then implement the minimal fix.
3. Run `make test-backend` (or the narrowest pytest target) and capture traces when flows run.
4. Document changes immediately (TaskTree CLI usage/help) before closing the task.
