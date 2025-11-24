
from typing import Any, cast

import yaml
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from tasktree.run_control import run_control
from tasktree.settings import settings

router = APIRouter()


class FlowUpdate(BaseModel):
    content: str

class FlowCreate(BaseModel):
    id: str
    content: str | None = None
    name: str | None = None
    description: str | None = None


class ControlledRunRequest(BaseModel):
    input: dict[str, Any] = {}
    breakpoints: list[str] | None = None


@router.get("/")
def list_flows() -> list[dict[str, Any]]:
    flows: list[dict[str, Any]] = []
    for path in settings.flows_dir.glob("*.yaml"):
        data = cast(dict[str, Any], yaml.safe_load(path.read_text()))
        flows.append(
            {
                "id": data["id"],
                "name": data.get("name", data["id"]),
                "description": data.get("description", ""),
            }
        )
    return flows


@router.get("/{flow_id}")
def get_flow(flow_id: str) -> dict[str, Any]:
    path = settings.flows_dir / f"{flow_id}.yaml"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"flow '{flow_id}' not found")
    text = path.read_text()
    data = cast(dict[str, Any], yaml.safe_load(text))
    data["_raw"] = text
    return data


@router.put("/{flow_id}")
def update_flow(flow_id: str, update: FlowUpdate) -> dict[str, Any]:
    path = settings.flows_dir / f"{flow_id}.yaml"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"flow '{flow_id}' not found")

    try:
        parsed = cast(dict[str, Any], yaml.safe_load(update.content))
    except yaml.YAMLError as exc:
        raise HTTPException(status_code=400, detail=f"invalid yaml: {exc}") from exc

    parsed_id = parsed.get("id")
    if parsed_id != flow_id:
        raise HTTPException(status_code=400, detail="flow id mismatch in content")

    path.write_text(update.content)
    return parsed


@router.post("/")
def create_flow(body: FlowCreate) -> dict[str, Any]:
    path = settings.flows_dir / f"{body.id}.yaml"
    if path.exists():
        raise HTTPException(status_code=400, detail="flow already exists")

    content = body.content
    if not content:
        name = body.name or body.id.replace("_", " ").title()
        content = yaml.safe_dump(
            {
                "id": body.id,
                "name": name,
                "version": "0.1.0",
                "description": body.description or "",
                "start": "start",
                "steps": [],
            },
            sort_keys=False,
        )

    try:
        parsed = cast(dict[str, Any], yaml.safe_load(content))
    except yaml.YAMLError as exc:
        raise HTTPException(status_code=400, detail=f"invalid yaml: {exc}") from exc

    if parsed.get("id") != body.id:
        raise HTTPException(status_code=400, detail="flow id mismatch in content")

    path.write_text(content)
    return parsed


@router.delete("/{flow_id}")
def delete_flow(flow_id: str) -> dict[str, str]:
    path = settings.flows_dir / f"{flow_id}.yaml"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"flow '{flow_id}' not found")
    path.unlink()
    return {"status": "deleted", "id": flow_id}


@router.post("/{flow_id}/run-controlled")
def start_controlled_run(flow_id: str, req: ControlledRunRequest) -> dict[str, Any]:
    pause_after = set(req.breakpoints) if req.breakpoints else set()
    controlled = run_control.start_run(flow_id, req.input, pause_after)
    if not controlled.session_id:
        raise HTTPException(status_code=500, detail="failed to start controlled run")
    return {
        "session_id": controlled.session_id,
        "flow_name": flow_id,
        "steps": [],
        "status": "running",
    }
