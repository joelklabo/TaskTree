import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter()
TRACE_ROOT = Path(__file__).resolve().parent.parent / "agents" / "trace" / "runs"


@router.get("/runs")
def list_runs() -> list[dict[str, Any]]:
    if not TRACE_ROOT.exists():
        return []
    runs: list[dict[str, Any]] = []
    for run_dir in TRACE_ROOT.iterdir():
        meta_path = run_dir / "meta.json"
        if meta_path.exists():
            meta = json.loads(meta_path.read_text())
            runs.append(meta)
    return runs


@router.get("/runs/{run_id}/trace")
def get_trace(run_id: str) -> list[dict[str, Any]]:
    trace_file = TRACE_ROOT / run_id / "trace.jsonl"
    if not trace_file.exists():
        raise HTTPException(404, "Trace not found")
    records = [json.loads(line) for line in trace_file.read_text().splitlines() if line]
    return records


def _artifact_root(run_id: str) -> Path:
    return (TRACE_ROOT / run_id / "artifacts").resolve()


@router.get("/runs/{run_id}/artifacts")
def list_artifacts(run_id: str) -> list[dict[str, Any]]:
    root = _artifact_root(run_id)
    if not root.exists():
        raise HTTPException(404, "Artifacts not found")

    artifacts: list[dict[str, Any]] = []
    for path in root.rglob("*"):
        if path.is_file():
            rel = path.relative_to(root).as_posix()
            artifacts.append({"path": rel, "size": path.stat().st_size})
    return artifacts


@router.get("/runs/{run_id}/artifacts/{artifact_path:path}")
def get_artifact(run_id: str, artifact_path: str) -> FileResponse:
    root = _artifact_root(run_id)
    if not root.exists():
        raise HTTPException(404, "Artifacts not found")
    target = (root / artifact_path).resolve()
    try:
        target.relative_to(root)
    except ValueError as exc:
        raise HTTPException(400, "Invalid artifact path") from exc
    if not target.exists() or not target.is_file():
        raise HTTPException(404, "Artifact not found")
    return FileResponse(target)
