from __future__ import annotations

from pathlib import Path

import yaml
from fastapi import APIRouter, HTTPException

from tasktree.settings import settings

router = APIRouter()


@router.get("/", summary="Constitiution definition")
def get_constitution() -> dict:
    path: Path = settings.constitution_path
    if not path.exists():
        raise HTTPException(status_code=404, detail="constitution file not found")
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except yaml.YAMLError as exc:  # pragma: no cover - safety net
        raise HTTPException(status_code=500, detail=f"invalid constitution yaml: {exc}") from exc
    return data
