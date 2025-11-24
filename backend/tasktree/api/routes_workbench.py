
from typing import Any

import yaml
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from tasktree.agents.base import AgentContext, registry
from tasktree.settings import settings

router = APIRouter()

class RunStepRequest(BaseModel):
    agent_id: str
    action: str
    input: dict[str, Any]
    prompt_override: str | None = None
    agent_config_override: dict[str, Any] | None = None
    session_id: str | None = None

@router.post("/step")
def run_single_step(req: RunStepRequest) -> dict[str, Any]:
    # Load agent config
    agent_file = f"{req.agent_id}.yaml"
    agent_cfg_path = settings.agents_dir / agent_file

    if not agent_cfg_path.exists():
        if req.agent_id == "codex_cli":
            agent_cfg_path = settings.agents_dir / "codex_cli.yaml"
        else:
            raise HTTPException(
                status_code=404,
                detail=f"Agent config not found for {req.agent_id}",
            )

    agent_cfg = yaml.safe_load(agent_cfg_path.read_text())
    
    # Apply overrides
    if req.agent_config_override:
        agent_cfg.update(req.agent_config_override)

    try:
        agent = registry.create(req.agent_id, agent_cfg)
    except KeyError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Agent '{req.agent_id}' not registered",
        ) from exc

    # Handle prompt override
    # This is tricky because agents load templates from disk.
    # We can monkey-patch the agent's environment or use a temporary file.
    # Or, if the agent supports it, pass the template directly.
    # CodexCLIAgent uses self.env.get_template(template_name).
    
    if req.prompt_override:
        # We can use Jinja2's FunctionLoader or DictLoader if we could re-init the env.
        # But we are using the agent as is.
        # Hack: Write to a temp file in the prompts dir and use that name?
        # Or better: Modify CodexCLIAgent to accept an override map.
        
        # Let's try to inject it into the agent instance if it's a CodexCLIAgent
        if hasattr(agent, "env") and hasattr(agent, "cfg"):
            from jinja2 import ChoiceLoader, DictLoader

            override_name = agent.cfg.prompt_map.get(req.action, req.action)
            override_loader = DictLoader({override_name: req.prompt_override})
            agent.env.loader = ChoiceLoader([override_loader, agent.env.loader])

    ctx = AgentContext(
        session_id=req.session_id or "workbench-session",
        flow_name="workbench",
        flow_version="0.0.0",
        step_name="workbench-step",
        input=req.input,
        strategies=[],
    )

    try:
        out = agent.run_step(req.action, ctx)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {
        "prompt": out.prompt,
        "raw_response": out.raw_response,
        "parsed": out.parsed,
        "result": {
            "status": out.result.status.value,
            "output": out.result.output,
            "metrics": out.result.metrics,
            "learnings": out.result.learnings,
            "label": out.result.label,
        }
    }
