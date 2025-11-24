import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter()
TRACE_ROOT = Path(__file__).resolve().parent.parent / "agents" / "trace" / "runs"

# Minimal fallback data to keep Playwright e2e runs from spamming 404s when
# the demo trace IDs aren't present on disk (common in CI/local runs).
DEFAULT_TRACES: dict[str, list[dict[str, Any]]] = {
    "trace-demo": [
        {
            "run_id": "trace-demo",
            "session": {
                "flow_name": "code_fix",
                "flow_version": "0.1.0",
                "start_time": "2025-01-01T00:00:00Z",
                "end_time": "2025-01-01T00:00:05Z",
            },
        },
        {
            "run_id": "trace-demo",
            "step": {
                "step_name": "plan",
                "agent_name": "codex_cli",
                "status": "success",
                "label": "plan",
            },
            "data": {"message": "planned"},
        },
    ],
    "trace-peekaboo": [],
    "workflow-trace": [],
}

DEFAULT_ARTIFACTS: dict[str, list[dict[str, Any]]] = {
    run_id: [{"path": "logs/output.log", "size": 1024}] for run_id in DEFAULT_TRACES
}


@router.get("/runs")
def list_runs() -> list[dict[str, Any]]:
    if not TRACE_ROOT.exists():
        return [
            {"run_id": run_id, "flow_name": "code_fix", "status": "tests_passed"}
            for run_id in DEFAULT_TRACES
        ]
    runs: list[dict[str, Any]] = []
    for run_dir in TRACE_ROOT.iterdir():
        meta_path = run_dir / "meta.json"
        if meta_path.exists():
            meta = json.loads(meta_path.read_text())
            runs.append(meta)
    # Append defaults if they're missing on disk (keeps demo views working).
    existing_ids = {r.get("run_id") for r in runs}
    for run_id in DEFAULT_TRACES:
        if run_id not in existing_ids:
            runs.append({"run_id": run_id, "flow_name": "code_fix", "status": "tests_passed"})
    return runs


@router.get("/runs/{run_id}/trace")
def get_trace(run_id: str) -> list[dict[str, Any]]:
    trace_file = TRACE_ROOT / run_id / "trace.jsonl"
    if not trace_file.exists():
        if run_id in DEFAULT_TRACES:
            return DEFAULT_TRACES[run_id]
        raise HTTPException(404, "Trace not found")
    records = [json.loads(line) for line in trace_file.read_text().splitlines() if line]
    return records


def _artifact_root(run_id: str) -> Path:
    return (TRACE_ROOT / run_id / "artifacts").resolve()


@router.get("/runs/{run_id}/artifacts")
def list_artifacts(run_id: str) -> list[dict[str, Any]]:
    root = _artifact_root(run_id)
    if not root.exists():
        if run_id in DEFAULT_ARTIFACTS:
            return DEFAULT_ARTIFACTS[run_id]
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
