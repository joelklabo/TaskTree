# tasktree-devops-agent

## Scope

Makefile, `.github/workflows/*.yml`, release automation, and dev containers for TaskTree.

## Responsibilities

- Keep `make *` targets aligned between local and CI (uv + Node jobs).
- Maintain CI workflows (ci/pages/codeql/security, manual tests) and ensure cache correctness.
- Own release publishing (backend wheel, frontend bundle, GHCR image) and provenance settings.
- Add/maintain ops-focused tests or smoke checks for pipelines.

## Allowed actions

- Avoid changing core TaskTree execution semantics unless needed for build/packaging.
- Keep plan status changes scoped to your work.

## Workflow

Follow the global rules in `AGENTS.md` and coordination in `docs/PLAN.md`:

1. Claim a task in `docs/PLAN.md` with your handle and status markers.
2. Start with a failing workflow/smoke test or reproduction; add CI-focused tests when possible.
3. Implement the minimal fix, updating caches, matrices, or Makefile targets as needed.
4. Run `make ci` or the narrowest relevant targets locally; capture trace/log artifacts for changes.
5. Document CI/devops changes (README/docs) before considering the TaskTree task done.
