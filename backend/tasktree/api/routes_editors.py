
from pathlib import Path

import yaml
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from tasktree.settings import settings

router = APIRouter()

class PromptUpdate(BaseModel):
    content: str

class FileUpdate(BaseModel):
    content: str

def _validate_path(directory: Path, name: str) -> Path:
    path = directory / name
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    # Security check
    if directory.resolve() not in path.resolve().parents:
        raise HTTPException(status_code=403, detail="Invalid path")
    return path

@router.get("/prompts")
def list_prompts() -> list[str]:
    if not settings.prompts_dir.exists():
        return []
    return [p.name for p in settings.prompts_dir.glob("*.j2")]

@router.get("/prompts/{name}")
def get_prompt(name: str) -> dict[str, str]:
    path = _validate_path(settings.prompts_dir, name)
    return {
        "name": name,
        "content": path.read_text(encoding="utf-8")
    }

@router.put("/prompts/{name}")
def update_prompt(name: str, update: PromptUpdate) -> dict[str, str]:
    path = _validate_path(settings.prompts_dir, name)
    path.write_text(update.content, encoding="utf-8")
    return {"status": "ok", "name": name}

# --- Flows ---

@router.get("/flows")
def list_flows() -> list[str]:
    if not settings.flows_dir.exists():
        return []
    return [p.name for p in settings.flows_dir.glob("*.yaml")]

@router.get("/flows/{name}")
def get_flow(name: str) -> dict[str, str]:
    path = _validate_path(settings.flows_dir, name)
    return {
        "name": name,
        "content": path.read_text(encoding="utf-8")
    }

@router.put("/flows/{name}")
def update_flow(name: str, update: FileUpdate) -> dict[str, str]:
    path = _validate_path(settings.flows_dir, name)
    try:
        yaml.safe_load(update.content)
    except yaml.YAMLError as e:
        raise HTTPException(status_code=400, detail=f"Invalid YAML: {e}") from e
    
    path.write_text(update.content, encoding="utf-8")
    return {"status": "ok", "name": name}

# --- Agents ---

@router.get("/agents")
def list_agents() -> list[str]:
    if not settings.agents_dir.exists():
        return []
    return [p.name for p in settings.agents_dir.glob("*.yaml")]

@router.get("/agents/{name}")
def get_agent(name: str) -> dict[str, str]:
    path = _validate_path(settings.agents_dir, name)
    return {
        "name": name,
        "content": path.read_text(encoding="utf-8")
    }

@router.put("/agents/{name}")
def update_agent(name: str, update: FileUpdate) -> dict[str, str]:
    path = _validate_path(settings.agents_dir, name)
    try:
        yaml.safe_load(update.content)
    except yaml.YAMLError as e:
        raise HTTPException(status_code=400, detail=f"Invalid YAML: {e}") from e
    
    path.write_text(update.content, encoding="utf-8")
    return {"status": "ok", "name": name}
