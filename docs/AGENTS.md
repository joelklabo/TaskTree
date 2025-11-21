# TaskTree Agents

TaskTree treats agents as plugins: small, focused Python classes that turn context + prompts into actions and results. Everything should be implemented in a **TTD workflow: Test-first, Trace, Document**. That means you do **not** write or ship code without tests, traces, and documentation:

1. Start with a failing test or reproduction (unit, integration, or CLI-level).
2. Make the smallest change to get green.
3. Capture traces/artifacts when running flows (via the trace wrapper) to keep runs reproducible.
4. Document the change immediately (README, docs/, comments where needed).
5. Commit early and often with clear messages.
6. Run `make test` (backend + frontend + Playwright e2e) on every change—no skipping e2e even for docs-only or “tiny” edits.
7. If you cannot add a test/trace (e.g., missing infra), document the gap in the PR/commit message and add a TODO to backfill.

Commit helper: use `scripts/runner.sh "<message>"` to serialize commits, rebase on origin/<branch>, run `make ci`, then push. Install hooks first via `scripts/git_hooks/install_hooks.sh`.

This document covers:
- The agent interface
- YAML configuration
- Built-in/planned agents
- Leases & the constitution
- Adding a new agent
- Recommended TTD loop for agents
- ChatOps commands
- Make targets quick reference

---

## 1. Agent model

All agents implement the `Agent` protocol in `tasktree.agents.base`:

```python
class Agent(Protocol):
    id: str

    def run_step(self, action: str, ctx: AgentContext) -> AgentOutput:
        ...
```

Key types:
- AgentContext: session_id, flow_name, flow_version, step_name, input (flow input + prior outputs), strategies (self-improvement hooks)
- AgentOutput: prompt, raw_response, parsed, result (TaskResult with status, output, metrics, learnings, optional label for routing)

Agents are created via the registry:

```python
from tasktree.agents.base import registry

agent = registry.create(agent_id="copilot_cli", config=agent_config_dict)
```

An agent implementation registers itself in `tasktree.agents.__init__` (see copilot_cli registration).

---

## 2. Agent configuration (YAML)

Each agent has a YAML definition in `backend/tasktree/config/agents/`.

Example: `copilot_cli.yaml`

```
id: copilot_cli
name: "Copilot CLI Agent"
description: "Uses an LLM to generate commands and optionally execute them."
model: "gpt-4.1-mini"
temperature: 0.2
max_tokens: 256
tools:
  - type: "shell"
    allow_write: true
    root: "."
```

The YAML dict is passed to your agent class; define whatever keys you need, but ensure your code validates them.

---

## 3. Built-in agents

### 3.1 copilot_cli
- Goal: Given a prompt template and context, generate shell commands and run them.
- Config file: `config/agents/copilot_cli.yaml`
- Typical actions: `plan_bugfix`, `implement_fix`, `run_tests`.
- Implementation expectations:
  1. Load a Jinja2 template (e.g. `code_plan.j2`) based on action.
  2. Render with `ctx.input` and strategies.
  3. Call the LLM backend using `config["model"]`, etc.
  4. Parse JSON; fill `TaskResult`.
  5. Optionally execute returned commands (start in dry-run first).

### 3.2 Planned agents
- planner: produce task DAGs.
- test_runner: run project tests (could wrap pytest).
- debugger: read failing tests and suggest fixes.
- ci_watcher: poll CI and emit events like `merged`.

---

## 4. Leases & the constitution

Agents are subject to `config/constitution.yaml`.

- Ownership: certain paths are reserved (e.g., `docs/PLAN.md` -> scribe). Respect ownership before writing.
- Protected paths: listed under `protected`; executor will block writes from non-owners.
- Leases: executor acquires leases for resources defined in flow YAML via `coord.leases.acquire`; leases live in `leases/`.
- Task state machine: labels like `tests_passed`/`tests_failed` can drive transitions.

---

## 5. TTD loop for agents (recommended)

1. Reproduce the task via flow input or unit test.
2. Write/adjust tests (pytest, integration, or golden trace) to capture expected behavior.
3. Run tests to see them fail.
4. Implement the smallest change in the agent or prompts.
5. Run `make lint test` (or narrower targets) and `ruff format`/`prettier` as needed. `make test` **always** runs backend pytest and frontend Vitest + Playwright e2e; do not skip e2e.
6. Generate/update traces with `uv run -m tasktree.agents.trace.record ...` when flows are run.
7. Update docs/README with what changed and why; attach artifacts where useful.
8. Commit with a concise message. Commit early and often.
9. Do not stop the loop early: only stop when work is blocked (`wait`), all tasks are done (`discover`), or a human interrupts. Treat "reporting progress" alone as invalid stop condition.
10. When updating plan docs or marking tasks done, identify yourself with a **color-based handle** derived from the session start timestamp to avoid collisions across agents. Suggested algorithm: pick a color list (["red","blue","green","amber","teal","violet","gray"]); compute `idx = (timestamp_seconds % len(colors))`; handle = `colors[idx]` + "-" + `last4hex(timestamp_seconds)`. Keep the same handle for the session; do not use plain names like "assistant".

Autonomous loop guardrails:
- Check plan status before/after tasks; if not action=discover/wait, keep going.
- Valid stop reasons: discover (no tasks), wait (blocked/lock), human interrupt, unrecoverable error after retries.
- Invalid stop reasons: "just reporting progress", "task looks hard", stopping without checking status.

---

## 6. Adding a new agent

1. Create `config/agents/your_agent_id.yaml` with required params.
2. Implement `tasktree/agents/your_agent_id.py`:

```python
from tasktree.agents.base import Agent, AgentContext, AgentOutput
from tasktree.core.state import TaskResult, StepStatus

class YourAgent(Agent):
    def __init__(self, config: dict):
        self.id = config["id"]
        self.config = config

    def run_step(self, action: str, ctx: AgentContext) -> AgentOutput:
        # TODO: load prompt template based on action
        prompt = "..."
        raw = "..."
        parsed = {}
        result = TaskResult(
            status=StepStatus.SUCCESS,
            output="...",
            metrics={},
            learnings=[],
        )
        return AgentOutput(prompt=prompt, raw_response=raw, parsed=parsed, result=result)
```

3. Register in `tasktree/agents/__init__.py`:

```python
from tasktree.agents.base import registry
from .your_agent_id import YourAgent

registry.register("your_agent_id", lambda cfg: YourAgent(cfg))
```

4. Reference `agent: your_agent_id` in flow YAML.

Helpers to reuse:
- `tasktree/agents/runner.py` — CommandRunner with allow/deny lists, dry-run, timeouts, and destructive-command blocking for any shell commands an agent chooses to execute.
- `tasktree/agents/validation.py` — `validate_standard_agent_response` enforces the common status/summary/commands/metrics/learnings shape on LLM output.
- `tasktree/agents/llm.py` — backends for calling an HTTP API or an external CLI that emits JSON; pair with the validator to keep outputs predictable.

---

## 7. Tracing & artifacts

Run flows via the trace wrapper to capture runs:

```
cd backend
uv run -m tasktree.agents.trace.record \
  uv run tt run code_fix --input '{"bug_description": "..." }'
```

This creates:

```
backend/tasktree/agents/trace/runs/<RUN_ID>/
  meta.json
  env.lock
  agent.log
  trace.jsonl
  artifacts/
```

Agents can write artifacts via `tasktree.tracing.Tracer.artifact_path`.

---

## 8. ChatOps commands (slash commands on PRs)

- `/test backend` — run backend lint/tests via `manual-tests.yml`.
- `/test frontend` — run frontend lint/unit/e2e.
- `/test docs` — run docs/shell linters.
- `/test all` — run everything.
- Planned: `/release` to trigger the release workflow and `/format` for auto-formatting staged paths.

---

## 9. Make targets quick reference

| Scenario | Backend | Frontend | Tools/notes | All-in-one |
| --- | --- | --- | --- | --- |
| Fresh setup (full) | `make setup-backend` | `make setup-frontend` | `make setup-tools` (installs shfmt/shellcheck) | `make setup` |
| Fresh setup (skip tools) | `make setup-backend` | `make setup-frontend` | — | `make setup-fast` |
| Format | `make format-backend` | `make format-frontend` | — | `make format` |
| Lint | `make lint-backend` | `make lint-frontend` | `make lint-shfmt` / `make lint-shellcheck` | `make lint` |
| Test | `make test-backend` | `make test-frontend` | — | `make test` |
| Coverage | `make coverage-backend` | `make coverage-frontend` | — | `make coverage` |
| Build | `make build-backend` | `make build-frontend` | — | `make build` |
| Dev servers | `make dev-backend` | `make dev-frontend` | — | `make dev` (both) |
| Scripts checks | — | — | `make verify-scripts` (shellcheck + tmux smokes) | — |

Notes: `make test` runs backend pytest plus frontend Vitest **and** Playwright e2e (mandatory on every change). `make ci` runs lint + test + build. `make setup-tools` installs shfmt/shellcheck into `.bin/` (PATH). For e2e-only reruns: `make test-e2e` (frontend Playwright).

### Agent docs (naming + guardrail)
- Agent guides live in `agents/tasktree-*-agent.md` (one file per agent area).
- Filenames must use the `tasktree-` prefix; stale `context-*` names/strings are blocked by `backend/tests/test_agent_docs.py`.
- Keep each doc TaskTree-specific and mention `AGENTS.md` + `docs/PLAN.md` for coordination.
