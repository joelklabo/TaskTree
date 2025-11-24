from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query

from tasktree.prompt_introspect import build_skeleton, template_for_action, template_for_name

router = APIRouter()


@router.get("/skeleton")
def prompt_skeleton(
    action: str | None = Query(None, description="Flow action name (e.g., implement_feature)"),
    agent: str = Query("codex_cli", description="Agent id (default: codex_cli)"),
    template: str | None = Query(
        None, description="Prompt template filename (e.g., feature_impl.j2). Overrides action."
    ),
) -> dict[str, Any]:
    """
    Return a blank JSON object with the keys referenced by the prompt template for this action.
    Useful for showing users what fields to fill.
    """
    if not action and not template:
        raise HTTPException(status_code=400, detail="action or template is required")

    try:
        if template:
            template_path = template_for_name(template)
            template_name = template_path.name
        else:
            template_path, template_name = template_for_action(agent, action or "")
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    skeleton = build_skeleton(template_path)
    return {
        "action": action,
        "agent": agent,
        "template": template_name,
        "skeleton": skeleton,
    }
