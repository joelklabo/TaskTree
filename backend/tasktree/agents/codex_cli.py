from __future__ import annotations

import json
import logging
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, TemplateNotFound, select_autoescape

from tasktree.agents.base import Agent, AgentContext, AgentOutput
from tasktree.agents.llm import CodexCLIBackend, ExternalCLIBackend
from tasktree.agents.runner import CommandRunner
from tasktree.agents.validation import ResponseValidationError, validate_standard_agent_response
from tasktree.core.state import StepStatus, TaskResult
from tasktree.settings import settings
from tasktree.tracing import Tracer

PromptMap = {
    "plan_bugfix": "code_plan.j2",
    "implement_fix": "code_impl.j2",
    "run_tests": "test_run.j2",
    "investigate_error": "error_investigate.j2",
    "check_retry_count": "error_retry_check.j2",
    "triage_failure": "error_triage.j2",
    "analyze_test_spec": "test_spec_analyze.j2",
    "plan_test_implementation": "test_plan.j2",
    "implement_test_code": "test_implement.j2",
    "review_test_code": "test_review.j2",
    "analyze_feature_spec": "feature_analyze.j2",
    "implement_feature": "feature_impl.j2",
    "verify_feature": "feature_verify.j2",
    "research_feature": "feature_research.j2",
    "build_failing_tests": "feature_tests.j2",
    "implement_feature_iterative": "feature_impl_iterative.j2",
    "create_feature_issue": "feature_issue.j2",
    "commit_feature": "feature_commit.j2",
}


logger = logging.getLogger(__name__)


@dataclass
class CodexConfig:
    id: str
    prompt_dir: Path
    prompt_map: dict[str, str]
    execute_commands: bool
    mock_responses: dict[str, str]
    shell_root: Path
    model: str
    llm_enabled: bool
    llm_timeout_sec: float
    backend_type: str
    backend_cmd: list[str]
    command_timeout_sec: float | None
    command_dry_run: bool
    block_destructive: bool

    @classmethod
    def from_dict(cls, cfg: dict[str, Any]) -> CodexConfig:
        backend_cmd_cfg = cfg.get("backend_cmd", ["codex"])
        if isinstance(backend_cmd_cfg, str):
            backend_cmd_list = [backend_cmd_cfg]
        elif backend_cmd_cfg is None:
            backend_cmd_list = ["codex"]
        else:
            backend_cmd_list = list(backend_cmd_cfg)
        if not backend_cmd_list:
            backend_cmd_list = ["codex"]
        return cls(
            id=cfg.get("id", "codex_cli"),
            prompt_dir=Path(cfg.get("prompt_dir", settings.prompts_dir)),
            prompt_map=cfg.get("prompt_map", dict(PromptMap)),
            execute_commands=bool(cfg.get("execute_commands", False)),
            mock_responses=cfg.get("mock_responses", {}),
            shell_root=Path(cfg.get("root", ".")),
            model=cfg.get("model", "gpt-4.1-mini"),
            llm_enabled=bool(cfg.get("llm_enabled", True)),
            llm_timeout_sec=float(cfg.get("llm_timeout_sec", 60.0)),
            backend_type=cfg.get("backend_type", "codex_cli"),
            backend_cmd=backend_cmd_list,
            command_timeout_sec=cfg.get("command_timeout_sec"),
            command_dry_run=bool(cfg.get("command_dry_run", False)),
            block_destructive=bool(cfg.get("block_destructive", True)),
        )


class CodexCLIAgent(Agent):
    """Prompt-driven agent that uses the Codex CLI backend by default."""

    def __init__(self, config: dict[str, Any]):
        self.cfg = CodexConfig.from_dict(config)
        print(
            "DEBUG: CodexCLIAgent initialized with "
            f"id={self.cfg.id} llm_enabled={self.cfg.llm_enabled} "
            f"backend_cmd={self.cfg.backend_cmd}"
        )
        self.id = self.cfg.id
        self.env = Environment(
            loader=FileSystemLoader(self.cfg.prompt_dir),
            autoescape=select_autoescape(),
            trim_blocks=True,
            lstrip_blocks=True,
        )
        self.command_runner = CommandRunner(
            workdir=self.cfg.shell_root,
            timeout_sec=self.cfg.command_timeout_sec,
            dry_run=self.cfg.command_dry_run,
            block_destructive=self.cfg.block_destructive,
        )
        self._backend: CodexCLIBackend | ExternalCLIBackend | None = None
        self._cached_backend_model: str | None = None
        self._current_context: dict[str, Any] = {}

    def run_step(self, action: str, ctx: AgentContext) -> AgentOutput:
        flow_input = ctx.input if isinstance(ctx.input, dict) else {}
        retry_count = flow_input.get("retry_count", getattr(ctx, "retry_count", 0))
        max_retries = flow_input.get("max_retries", getattr(ctx, "max_retries", 2))
        model_override = flow_input.get("llm_model") or flow_input.get("model")
        metadata = getattr(ctx, "metadata", {}) or {}
        self._current_context = {
            "session_id": ctx.session_id,
            "flow_name": ctx.flow_name,
            "flow_version": ctx.flow_version,
            "step_name": ctx.step_name,
            "retry_count": retry_count,
            "max_retries": max_retries,
            **metadata,
        }
        if model_override:
            self._current_context["llm_model"] = model_override
        self._persist_config_log(ctx, action)

        try:
            prompt = self._render_prompt(action, ctx)
        except Exception as exc:
            logger.error(f"Failed to render prompt for {action}: {exc}")
            return AgentOutput(
                prompt="",
                raw_response="",
                parsed={},
                result=TaskResult(
                    status=StepStatus.FAILURE,
                    output=f"Prompt render error: {exc}",
                    metrics={},
                    learnings=[],
                ),
            )

        try:
            raw_response = self._response_for(action, prompt, ctx)
        except Exception as exc:
            logger.error(f"LLM/Mock failure for {action}: {exc}")
            return AgentOutput(
                prompt=prompt,
                raw_response="",
                parsed={},
                result=TaskResult(
                    status=StepStatus.FAILURE,
                    output=f"Backend error: {exc}",
                    metrics={},
                    learnings=[],
                ),
            )

        self._log_llm_transcript(ctx.session_id, ctx.step_name, action, "RESPONSE", raw_response)

        try:
            parsed = self._parse_json(raw_response, action)
        except ValueError as exc:
            return AgentOutput(
                prompt=prompt,
                raw_response=raw_response,
                parsed={},
                result=TaskResult(
                    status=StepStatus.FAILURE,
                    output=f"Parse error: {exc}\nRaw: {raw_response}",
                    metrics={},
                    learnings=[],
                ),
            )

        commands = parsed.get("commands", [])
        cmd_output = ""
        if self.cfg.execute_commands and commands:
            cmd_output = self._maybe_run_commands(commands)

        summary = parsed.get("summary", "Action completed")
        if cmd_output:
            summary += f"\n\nCommand Output:\n{cmd_output}"

        result = TaskResult(
            status=StepStatus.SUCCESS,
            output=summary,
            metrics=parsed.get("metrics", {}),
            learnings=parsed.get("learnings", []),
            label=parsed.get("label"),
        )

        # Trace artifact
        try:
            Tracer.log_step(
                session_id=ctx.session_id,
                step=ctx.step_name,
                action=action,
                prompt=prompt,
                response=raw_response,
                parsed=parsed,
                result=asdict(result),
                config=self._config_snapshot(ctx),
            )
        except Exception as exc:  # pragma: no cover - defensive
            logger.debug("Failed to write trace artifact", exc_info=exc)

        return AgentOutput(prompt=prompt, raw_response=raw_response, parsed=parsed, result=result)

    def _log_llm_transcript(
        self, session_id: str, step_name: str, action: str, msg_type: str, content: str
    ) -> None:
        """Log LLM prompts and responses to transcript and combined debug log."""
        import time

        from tasktree.settings import settings as project_settings

        log_dir = project_settings.base_dir.parent / "logs"
        log_dir.mkdir(exist_ok=True)
        transcript_file = log_dir / "llm-transcript.log"
        debug_file = log_dir / "debug.log"

        scenario_id = None
        try:
            scenario_id = (
                self._current_context.get("scenario_id")
                if isinstance(self._current_context, dict)
                else None
            )
        except Exception:
            scenario_id = None
        scenario_tag = None
        if scenario_id:
            scenario_str = str(scenario_id)
            scenario_tag = (
                scenario_str if scenario_str.startswith("scn-") else f"scn-{scenario_str}"
            )
        scenario_part = f" [{scenario_tag}]" if scenario_tag else ""

        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        separator = "=" * 80

        with transcript_file.open("a", encoding="utf-8") as f:
            f.write(f"\n{separator}\n")
            f.write(f"[{timestamp}] SESSION: {session_id[:8]}{scenario_part}\n")
            f.write(f"STEP: {step_name} | ACTION: {action} | TYPE: {msg_type}\n")
            f.write(f"{separator}\n")
            f.write(f"{content}\n")
            f.write(f"{separator}\n\n")

        with debug_file.open("a", encoding="utf-8") as f:
            content_preview = (
                content[:200].replace("\n", " ")
                if len(content) > 200
                else content.replace("\n", " ")
            )
            preview = content_preview[:60] + ("..." if len(content_preview) > 60 else "")
            log_line = (
                f"[{timestamp}] {msg_type:8} {session_id[:8]}{scenario_part} {step_name:15} "
                f"{action:20} | {preview}\n"
            )
            f.write(log_line)

        logger.info(f"LLM {msg_type} for {step_name}/{action}")

    def _render_prompt(self, action: str, ctx: AgentContext) -> str:
        metadata = getattr(ctx, "metadata", {}) or {}
        prompt_overrides = {}
        if isinstance(metadata, dict):
            prompt_overrides = metadata.get("prompt_overrides", {})

        template_name = self.cfg.prompt_map.get(action)
        if not template_name:
            raise KeyError(f"No prompt mapped for action '{action}'")

        override_template = prompt_overrides.get(action)
        if override_template:
            template = self.env.from_string(override_template)
        else:
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

    def _response_for(self, action: str, prompt: str, ctx: AgentContext) -> str:
        if self.cfg.llm_enabled:
            backend = self._get_backend(ctx)
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
        if action == "investigate_error":
            return json.dumps(
                {
                    "status": "success",
                    "summary": "Investigated error and identified root cause (mock).",
                    "learnings": [],
                    "commands": [],
                }
            )
        if action == "check_retry_count":
            retry_count = self._get_retry_count_from_context()
            max_retries = self._get_max_retries_from_context()
            label = "should_triage" if retry_count >= max_retries else "should_retry"
            action = "escalating" if label == "should_triage" else "retrying"
            return json.dumps(
                {
                    "status": "success",
                    "label": label,
                    "summary": f"Retry {retry_count}/{max_retries} - {action}",
                    "learnings": [],
                }
            )
        if action == "triage_failure":
            return json.dumps(
                {
                    "status": "success",
                    "summary": "Triage complete: escalating to human review (mock).",
                    "learnings": ["Multiple retry attempts failed", "Human review needed"],
                    "commands": [],
                }
            )
        if action == "analyze_feature_spec":
            return json.dumps(
                {
                    "status": "success",
                    "summary": "Analyzed feature spec (mock).",
                    "label": "planned",
                    "learnings": [],
                    "commands": [],
                }
            )
        if action == "implement_feature":
            return json.dumps(
                {
                    "status": "success",
                    "summary": "Implemented feature (mock).",
                    "label": "implemented",
                    "learnings": [],
                    "commands": [],
                }
            )
        if action == "verify_feature":
            return json.dumps(
                {
                    "status": "success",
                    "summary": "Verified feature (mock).",
                    "label": "verified",
                    "learnings": [],
                    "commands": [],
                }
            )

        raise RuntimeError(
            f"No mock response configured for action '{action}'. "
            "Provide mock_responses in config or integrate an LLM."
        )

    def _get_backend(self, ctx: AgentContext) -> CodexCLIBackend | ExternalCLIBackend:
        backend_type = self.cfg.backend_type or "codex_cli"

        if backend_type == "codex_cli":
            resolved_model = self._resolve_model(ctx)
            if self._backend and self._cached_backend_model == resolved_model:
                return self._backend

            command = self.cfg.backend_cmd or ["codex"]
            if not command:
                raise RuntimeError("codex_cli backend requires a command (e.g., ['codex'])")

            backend: CodexCLIBackend | ExternalCLIBackend
            backend = CodexCLIBackend(
                command=command,
                model=resolved_model,
                workdir=self.cfg.shell_root,
                timeout_sec=self.cfg.llm_timeout_sec,
            )
            self._cached_backend_model = resolved_model

        elif backend_type == "external_cli":
            if not self.cfg.backend_cmd:
                raise RuntimeError("external_cli backend requires backend_cmd")
            backend = ExternalCLIBackend(
                command=self.cfg.backend_cmd,
                workdir=self.cfg.shell_root,
                timeout_sec=self.cfg.llm_timeout_sec,
            )

        else:
            raise RuntimeError(f"Unknown backend type: {backend_type}")

        self._backend = backend
        return backend

    def _parse_json(self, raw: str, action: str) -> dict[str, Any]:
        try:
            parsed_raw = json.loads(raw)
        except Exception as exc:
            logger.error(f"Raw LLM response for '{action}':\n{raw[:500]}")
            raise ValueError(
                f"Failed to parse response for action '{action}': {exc}\n"
                f"Raw response (first 200 chars): {raw[:200]}"
            ) from exc

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
            if result.returncode != 0:
                section = f"{section}\n(exit={result.returncode})"
            outputs.append(section)
        return "\n\n".join(outputs)

    def _get_retry_count_from_context(self) -> int:
        return int(self._current_context.get("retry_count", 0))

    def _get_max_retries_from_context(self) -> int:
        return int(self._current_context.get("max_retries", 2))

    def _resolve_model(self, ctx: AgentContext) -> str:
        override = ctx.input.get("llm_model") or ctx.input.get("model")
        if not override:
            override = self._current_context.get("llm_model") or self._current_context.get("model")
        model = override or self.cfg.model
        if not model:
            raise RuntimeError("No model configured for Codex CLI backend")
        return str(model)

    def _config_snapshot(self, ctx: AgentContext) -> dict[str, Any]:
        snap = asdict(self.cfg)
        snap["prompt_dir"] = str(self.cfg.prompt_dir)
        snap["shell_root"] = str(self.cfg.shell_root)
        snap["backend_cmd"] = list(self.cfg.backend_cmd)
        snap["resolved_model"] = (
            self._resolve_model(ctx) if self.cfg.llm_enabled else self.cfg.model
        )
        return snap

    def _persist_config_log(self, ctx: AgentContext, action: str) -> None:
        from tasktree.settings import settings as project_settings

        log_dir = project_settings.base_dir.parent / "logs"
        log_dir.mkdir(exist_ok=True)
        config_file = log_dir / "agent-config.log"
        entry = {
            "session_id": ctx.session_id,
            "flow_name": ctx.flow_name,
            "flow_version": ctx.flow_version,
            "step_name": ctx.step_name,
            "action": action,
            "config": self._config_snapshot(ctx),
        }
        with config_file.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(entry) + "\n")
