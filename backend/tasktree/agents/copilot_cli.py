from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, TemplateNotFound, select_autoescape

from tasktree.agents.base import Agent, AgentContext, AgentOutput
from tasktree.agents.llm import APIBackend, ExternalCLIBackend
from tasktree.agents.runner import CommandRunner
from tasktree.agents.validation import ResponseValidationError, validate_standard_agent_response
from tasktree.core.state import StepStatus, TaskResult
from tasktree.settings import settings
from tasktree.tracing import Tracer

PromptMap = {
    "plan_bugfix": "code_plan.j2",
    "implement_fix": "code_impl.j2",
    "run_tests": "test_run.j2",
}


logger = logging.getLogger(__name__)


@dataclass
class CopilotConfig:
    id: str
    prompt_dir: Path
    prompt_map: dict[str, str]
    execute_commands: bool
    mock_responses: dict[str, str]
    shell_root: Path
    model: str
    temperature: float
    max_tokens: int
    llm_enabled: bool
    llm_endpoint: str | None
    api_key_env: str | None
    llm_timeout_sec: float
    backend_type: str
    backend_cmd: list[str]
    command_allowlist: list[str]
    command_denylist: list[str]
    command_timeout_sec: float | None
    command_dry_run: bool
    block_destructive: bool

    @classmethod
    def from_dict(cls, cfg: dict[str, Any]) -> CopilotConfig:
        return cls(
            id=cfg.get("id", "copilot_cli"),
            prompt_dir=Path(cfg.get("prompt_dir", settings.prompts_dir)),
            prompt_map=cfg.get("prompt_map", dict(PromptMap)),
            execute_commands=bool(cfg.get("execute_commands", False)),
            mock_responses=cfg.get("mock_responses", {}),
            shell_root=Path(cfg.get("root", ".")),
            model=cfg.get("model", "gpt-4.1-mini"),
            temperature=float(cfg.get("temperature", 0.2)),
            max_tokens=int(cfg.get("max_tokens", 256)),
            llm_enabled=bool(cfg.get("llm_enabled", False)),
            llm_endpoint=cfg.get("llm_endpoint"),
            api_key_env=cfg.get("api_key_env"),
            llm_timeout_sec=float(cfg.get("llm_timeout_sec", 30.0)),
            backend_type=cfg.get("backend_type", "api"),
            backend_cmd=list(cfg.get("backend_cmd", [])),
            command_allowlist=list(cfg.get("command_allowlist", [])),
            command_denylist=list(cfg.get("command_denylist", [])),
            command_timeout_sec=cfg.get("command_timeout_sec"),
            command_dry_run=bool(cfg.get("command_dry_run", False)),
            block_destructive=bool(cfg.get("block_destructive", True)),
        )


class CopilotCLIAgent(Agent):
    """Prompt-driven agent with mock responses and optional command execution."""

    def __init__(self, config: dict[str, Any]):
        self.cfg = CopilotConfig.from_dict(config)
        self.id = self.cfg.id
        self.env = Environment(
            loader=FileSystemLoader(self.cfg.prompt_dir),
            autoescape=select_autoescape(enabled_extensions=("j2",)),
        )
        runner_dry_run = self.cfg.command_dry_run or not self.cfg.execute_commands
        self.command_runner = CommandRunner(
            allowlist=self.cfg.command_allowlist,
            denylist=self.cfg.command_denylist,
            timeout_sec=self.cfg.command_timeout_sec,
            dry_run=runner_dry_run,
            workdir=self.cfg.shell_root,
            block_destructive=self.cfg.block_destructive,
        )
        self._backend: APIBackend | ExternalCLIBackend | None = None
        self._backend_ready = False

    def run_step(self, action: str, ctx: AgentContext) -> AgentOutput:
        prompt = self._render_prompt(action, ctx)
        raw_response = self._response_for(action, prompt)
        parsed = self._parse_json(raw_response, action)

        commands = parsed.get("commands", [])
        executed_output = self._maybe_run_commands(commands)
        summary = parsed.get("summary") or parsed.get("output") or raw_response
        if executed_output:
            summary = f"{summary}\n\nCommands:\n{executed_output}"

        status = StepStatus.SUCCESS if parsed.get("status") == "success" else StepStatus.FAILURE
        metrics = parsed.get("metrics", {})
        learnings = parsed.get("learnings", [])
        label = parsed.get("label")

        result = TaskResult(
            status=status,
            output=summary,
            metrics=metrics if isinstance(metrics, dict) else {},
            learnings=learnings if isinstance(learnings, list) else [],
            label=label,
        )

        # Attach a simple artifact if tracing is active.
        try:
            tracer = Tracer()
            path = tracer.artifact_path(f"{ctx.step_name}/{action}.json")
            trace_snapshot = {
                "prompt": prompt,
                "raw_response": raw_response,
                "parsed": parsed,
                "commands": commands,
                "executed_output": executed_output,
                "command_policy": {
                    "execute_commands": self.cfg.execute_commands,
                    "dry_run": self.command_runner.dry_run,
                    "allowlist": self.cfg.command_allowlist,
                    "denylist": self.cfg.command_denylist,
                    "timeout_sec": self.cfg.command_timeout_sec,
                    "block_destructive": self.cfg.block_destructive,
                },
            }
            path.write_text(json.dumps(trace_snapshot, indent=2))
        except Exception as exc:
            logger.debug("Failed to write trace artifact", exc_info=exc)

        return AgentOutput(prompt=prompt, raw_response=raw_response, parsed=parsed, result=result)

    def _render_prompt(self, action: str, ctx: AgentContext) -> str:
        template_name = self.cfg.prompt_map.get(action)
        if not template_name:
            raise KeyError(f"No prompt mapped for action '{action}'")
        try:
            template = self.env.get_template(template_name)
        except TemplateNotFound as exc:
            raise FileNotFoundError(
                f"Prompt template '{template_name}' not found in {self.cfg.prompt_dir}"
            ) from exc

        data = {
            "input": ctx.input,
            "flow_name": ctx.flow_name,
            "flow_version": ctx.flow_version,
            "step_name": ctx.step_name,
            "strategies": ctx.strategies,
            "agent_id": self.id,
        }
        return template.render(**data)

    def _response_for(self, action: str, prompt: str) -> str:
        if self.cfg.llm_enabled:
            backend = self._get_backend()
            return backend.complete(prompt)

        if action in self.cfg.mock_responses:
            return self.cfg.mock_responses[action]

        if action == "run_tests":
            return json.dumps(
                {
                    "status": "success",
                    "label": "tests_passed",
                    "summary": "Tests passed (mock).",
                    "metrics": {"time_sec": 0.0},
                    "learnings": [],
                }
            )
        if action == "plan_bugfix":
            return json.dumps(
                {
                    "status": "success",
                    "summary": "Planned bugfix steps (mock).",
                    "learnings": [],
                    "commands": [],
                }
            )
        if action == "implement_fix":
            return json.dumps(
                {
                    "status": "success",
                    "summary": "Implemented fix (mock).",
                    "learnings": [],
                    "commands": [],
                }
            )

        raise RuntimeError(
            f"No mock response configured for action '{action}'. "
            "Provide mock_responses in config or integrate an LLM."
        )

    def _get_backend(self) -> APIBackend | ExternalCLIBackend:
        if self._backend_ready and self._backend is not None:
            return self._backend

        backend: APIBackend | ExternalCLIBackend | None = None
        if self.cfg.backend_type == "external_cli" or self.cfg.backend_cmd:
            if not self.cfg.backend_cmd:
                raise RuntimeError("external_cli backend requires backend_cmd")
            backend = ExternalCLIBackend(
                command=self.cfg.backend_cmd,
                workdir=self.cfg.shell_root,
                timeout_sec=self.cfg.llm_timeout_sec,
            )
        else:
            if not self.cfg.llm_endpoint:
                raise RuntimeError("LLM is enabled but no llm_endpoint provided in config")
            backend = APIBackend(
                endpoint=self.cfg.llm_endpoint,
                model=self.cfg.model,
                temperature=self.cfg.temperature,
                max_tokens=self.cfg.max_tokens,
                api_key_env=self.cfg.api_key_env,
                timeout_sec=self.cfg.llm_timeout_sec,
            )

        self._backend = backend
        self._backend_ready = True
        return backend

    def _parse_json(self, raw: str, action: str) -> dict[str, Any]:
        try:
            parsed_raw = json.loads(raw)
        except Exception as exc:
            raise ValueError(f"Failed to parse response for action '{action}': {exc}") from exc

        try:
            validated = validate_standard_agent_response(parsed_raw)
        except ResponseValidationError as exc:
            raise ValueError(f"Invalid response format for action '{action}': {exc}") from exc
        return validated

    def _maybe_run_commands(self, commands: list[str]) -> str:
        if not commands:
            return ""
        outputs: list[str] = []
        for cmd in commands:
            try:
                result = self.command_runner.run(cmd)
            except PermissionError as exc:
                outputs.append(f"$ {cmd}\n[blocked] {exc}")
                continue
            section = f"$ {cmd}\n{result.stdout}".rstrip()
            if result.stderr:
                section = f"{section}\n{result.stderr}".rstrip()
            outputs.append(section)
        return "\n\n".join(outputs)
