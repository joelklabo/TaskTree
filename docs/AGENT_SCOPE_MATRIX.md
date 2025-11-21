# Agent Scope Matrix

This document captures the current ownership map for TaskTree agents and how overlaps were removed.

## Principles
- Each path prefix is owned by exactly one agent; tests enforce disjoint ownership.
- Every agent doc declares **Owns** and **Excludes** bullet lists.
- Cross-cutting work pairs with the owner instead of grabbing files ad hoc.

## Ownership map (source of truth)
- tasktree-cli-agent: `backend/tasktree/cli.py`
- tasktree-core-agent: `backend/tasktree/core/**`, `backend/tasktree/coord/**`, `backend/tasktree/config/flows/**`, `backend/tasktree/config/constitution.yaml`
- tasktree-debug-agent: `backend/tasktree/agents/trace/**`, `backend/tasktree/tracing.py`
- tasktree-devops-agent: `.github/workflows/**`, `Makefile`, `scripts/install_tools.sh`, `scripts/runner.sh`
- tasktree-docs-agent: `docs/**`, `README.md`, `AGENTS.md`, `agents/*.md`
- tasktree-git-agent: `.gitignore`, `.gitattributes`, `.git/hooks/**`, `scripts/git_hooks/**`
- tasktree-testing-agent: `backend/tests/**`, `frontend/tests/**`, `frontend/playwright.config.ts`, `frontend/vitest.setup.ts`, `scripts/tests/**`, `scripts/peekaboo_capture.sh`, `scripts/trace_artifact_upload.sh`
- tasktree-web-agent: `backend/tasktree/api/**`, `frontend/src/**`, `frontend/package.json`, `frontend/tailwind.config.ts`

## Enforcement
- `backend/tests/test_agent_scopes.py` parses all `agents/tasktree-*-agent.md` files, ensuring Owns/Excludes sections exist and that **Owns** path prefixes are unique.

## Next steps
- If a path needs to change owners, update the agent doc **and** adjust the test to avoid collisions.
- When adding a new agent, declare a non-overlapping Owns list and extend the test accordingly.
