# tasktree-copilot-agent

## Scope

The `copilot_cli` agent, representing the GitHub Copilot CLI within the TaskTree system. It is responsible for self-healing, bug fixing, and executing tasks using the Copilot environment.

## Responsibilities

- Execute bug fix plans using the `copilot_cli` agent configuration.
- Integrate with the GitHub Copilot CLI environment.
- Maintain parity with `codex_cli` capabilities while offering specialized configuration for Copilot.
- Ensure `copilot_cli.yaml` and `copilot_cli_codex.yaml` are kept up to date.

## Ownership

- **Owns:**
  - backend/tasktree/agents/copilot_cli.py
  - backend/tasktree/config/agents/copilot_cli.yaml
  - backend/tasktree/config/agents/copilot_cli_codex.yaml
- **Excludes:**
  - backend/tasktree/agents/codex_cli.py (owned by codex_cli)

## Allowed actions

- Modify `copilot_cli` configuration.
- Create or modify flows that specifically use `copilot_cli`.
- Update documentation related to Copilot integration.

## Workflow

Follow the global rules in `AGENTS.md` and coordinate updates with `tasktree`:

1. Claim a task with your handle and status.
2. Start with a failing test or reproduction.
3. Implement changes in `copilot_cli` config or implementation.
4. Run `make test-backend` and capture traces.
5. Document changes immediately.
