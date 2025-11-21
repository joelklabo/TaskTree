from typing import Any, cast

import yaml
from fastapi import APIRouter, HTTPException

from tasktree.settings import settings

router = APIRouter()


@router.get("/")
def list_flows() -> list[dict[str, Any]]:
    flows: list[dict[str, Any]] = []
    for path in settings.flows_dir.glob("*.yaml"):
        data = cast(dict[str, Any], yaml.safe_load(path.read_text()))
        flows.append({"id": data["id"], "description": data.get("description", "")})
    return flows


@router.get("/{flow_id}")
def get_flow(flow_id: str) -> dict[str, Any]:
    path = settings.flows_dir / f"{flow_id}.yaml"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"flow '{flow_id}' not found")
    return cast(dict[str, Any], yaml.safe_load(path.read_text()))
