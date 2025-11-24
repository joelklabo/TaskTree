# TaskTree Agents

TaskTree treats agents as plugins: small, focused Python classes that turn context + prompts into actions and results. Everything should be implemented in a **TTD workflow: Test-first, Trace, Document**. That means you do **not** write or ship code without tests, traces, and documentation:

1. Start with a failing test or reproduction (unit, integration, or CLI-level). **All logging must flow through TaskTree**: use the `/api/logs/*` endpoints or `tt logs` CLI, not ad-hoc `/tmp` tails or direct file reads.
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
- Debugger & Editor

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

agent = registry.create(agent_id="codex_cli", config=agent_config_dict)
```

An agent implementation registers itself in `tasktree.agents.__init__` (see codex_cli registration).

---

## 2. Agent configuration (YAML)

Each agent has a YAML definition in `backend/tasktree/config/agents/`.

Example: `codex_cli.yaml`

```
id: codex_cli
name: "Codex CLI Agent"
description: "Uses the Codex CLI backend to generate commands and optionally execute them."
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

### 3.1 codex_cli

- Goal: Given a prompt template and context, generate shell commands and run them via the Codex CLI backend (no shell wrapper).
- Config file: `config/agents/codex_cli.yaml` (main config; supports both mock and real LLM via `llm_enabled` flag)
- Typical actions: `plan_bugfix`, `implement_fix`, `run_tests`.
- Implementation expectations:
  1. Load a Jinja2 template (e.g. `code_plan.j2`) based on action.
  2. Render with `ctx.input` and strategies.
  3. Call the Codex CLI backend using `config["model"]` or an injected `llm_model` in flow input.
  4. Parse JSON; fill `TaskResult`.
  5. Optionally execute returned commands (start in dry-run first).
- The agent records prompt/response pairs and a full config snapshot in `logs/agent-config.log` and in trace artifacts when tracing is enabled.

### 3.2 copilot_cli

- Goal: Represents the GitHub Copilot CLI within TaskTree. It shares the `CodexCLIAgent` implementation but is tuned for self-healing and bug fixing tasks using the Copilot CLI environment.
- Config file: `config/agents/copilot_cli.yaml`
- Typical actions: `plan_bugfix`, `implement_fix`, `run_tests`.
- Implementation: Currently an alias for `CodexCLIAgent`, registered as `copilot_cli`.

### 3.3 Planned agents

- planner: produce task DAGs.
- test_runner: run project tests (could wrap pytest).
- debugger: read failing tests and suggest fixes.
- ci_watcher: poll CI and emit events like `merged`.

---

## 4. Leases & the constitution

Agents are subject to `config/constitution.yaml`.

- Ownership: certain paths are reserved (e.g., scribe-owned files). Respect ownership before writing.
- Protected paths: listed under `protected`; executor will block writes from non-owners.
- Leases: executor acquires leases for resources defined in flow YAML via `coord.leases.acquire`; leases live in `leases/`.
- Task state machine: labels like `tests_passed`/`tests_failed` can drive transitions.

---

## 5. TTD loop for agents (recommended)

1. Reproduce the task via flow input or unit test.
2. Write/adjust tests (pytest, integration, or golden trace) to capture expected behavior.
3. Run tests to see them fail.
4. Implement the smallest change in the agent or prompts.
5. Run `make lint test` (or narrower targets) and `ruff format`/`prettier` as needed. Ruff uses `--fix` during `make lint-backend`. All lint and format steps now print clear echo statements before each check or fix. For other autofixers, use:

- `make lint-frontend-fix` for ESLint/Prettier (frontend)
- `make lint-md-fix` for markdownlint (Markdown)
- `make lint-djlint-fix` for Djlint (Jinja2)
- `make lint-shfmt-fix` for shfmt (shell scripts)
  Run `make test` **always** runs backend pytest and frontend Vitest + Playwright e2e; do not skip e2e.

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

## Shell tool rubric (use these by default)

- Find files: `fd`
- Find text: `rg` (ripgrep)
- Find code structure (TS/TSX): `ast-grep` (`.ts` → `ast-grep --lang ts -p "<pattern>"`, `.tsx` → `--lang tsx`; other langs set `--lang` accordingly). Start with `rg` to shortlist, then `ast-grep` to match/modify.
- Fuzzy-pick matches: pipe to `fzf`
- JSON: `jq`; YAML/XML: `yq`
- Pretty file view: `bat`; modern ls: `eza`; fast cd: `zoxide`
- HTTP calls: `http` (httpie); git diff pager: `delta`

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

| Scenario                 | Backend                 | Frontend                 | Tools/notes                                      | All-in-one            |
| ------------------------ | ----------------------- | ------------------------ | ------------------------------------------------ | --------------------- |
| Fresh setup (full)       | `make setup-backend`    | `make setup-frontend`    | `make setup-tools` (installs shfmt/shellcheck)   | `make setup`          |
| Fresh setup (skip tools) | `make setup-backend`    | `make setup-frontend`    | —                                                | `make setup-fast`     |
| Format                   | `make format-backend`   | `make format-frontend`   | —                                                | `make format`         |
| Lint                     | `make lint-backend`     | `make lint-frontend`     | `make lint-shfmt` / `make lint-shellcheck`       | `make lint`           |
| Test                     | `make test-backend`     | `make test-frontend`     | —                                                | `make test`           |
| Coverage                 | `make coverage-backend` | `make coverage-frontend` | —                                                | `make coverage`       |
| Build                    | `make build-backend`    | `make build-frontend`    | —                                                | `make build`          |
| Dev servers              | `make dev-backend`      | `make dev-frontend`      | —                                                | `make dev` (both)     |
| Scripts checks           | —                       | —                        | `make verify-scripts` (shellcheck + tmux smokes) | —                     |
| Dev supervisor           | `make dev-supervisor`   | —                        | auto-restart loop keeps backend/frontend alive   | `make dev-supervisor` |

Dev supervisor notes:
- Uses `scripts/dev_supervisor.sh` to start backend (default :8000) and frontend (default :5173) in a tmux session (`tasktree-dev`). Attach with `tmux attach -t tasktree-dev` (Ctrl-b d to detach). If either server exits, the supervisor restarts it after 2s.
- Ports are configurable (`BACKEND_PORT`, `FRONTEND_PORT`); e2e uses :4173, so keep dev frontend on :5173 to avoid conflicts.

Notes: `make lint-backend` auto-applies Ruff fixes (`--fix`). `make test` runs backend pytest plus frontend Vitest **and** Playwright e2e (mandatory on every change). `make ci` runs lint + test + build. `make setup-tools` installs shfmt/shellcheck into `.bin/` (PATH). For e2e-only reruns: `make test-e2e` (frontend Playwright).

### Agent docs (naming + guardrail)

- Agent guides live in `agents/tasktree-*-agent.md` (one file per agent area).
- Filenames must use the `tasktree-` prefix; stale `context-*` names/strings are blocked by `backend/tests/test_agent_docs.py`.
- Keep each doc TaskTree-specific and mention `AGENTS.md` for coordination.

---

## 10. Debugger & Editor

TaskTree includes a live debugger and configuration editor.

### Editor
- **Prompts**: Edit Jinja2 templates in `config/prompts/`.
- **Flows**: Edit YAML flow definitions in `config/flows/`.
- **Agents**: Edit agent configurations in `config/agents/`.
- Access via the "Editor" tab in the frontend.

### Debugger
- **Live Debugging**: Pause/Resume/Step through flows.
- **Breakpoints**: Set breakpoints on specific steps.
- **Context Inspection**: View the full `AgentContext` at each step.
- **Control**:
  - `Step Over`: Execute one step and pause.
  - `Resume`: Continue until next breakpoint or end.
- Access via the "Debugger" tab in the frontend.
- Backend implementation: `tasktree.core.debug_session.DebugSession`.
