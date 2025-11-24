
from __future__ import annotations

import asyncio
import json
import os
from collections.abc import AsyncGenerator
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from tasktree import log_events
from tasktree.log_catalog import describe_log

router = APIRouter()


def _log_root() -> Path:
    env_root = os.getenv("TASKTREE_LOG_ROOT")
    return Path(env_root) if env_root else Path(__file__).resolve().parents[3] / "logs"


@router.get("/sources")
def list_sources() -> list[dict[str, Any]]:
    root = _log_root()
    root.mkdir(parents=True, exist_ok=True)
    sources: list[dict[str, Any]] = []
    for path in sorted(root.glob("*.log")):
        stat = path.stat()
        sources.append(
            {
                "name": path.name,
                "size": int(stat.st_size),
                "mtime": float(stat.st_mtime),
                "tags": [str(tag) for tag in _infer_tags(path.name)],
                "description": str(describe_log(path.name)),
            }
        )
    return sources


@router.get("/tail")
def tail_log(
    source: str = Query(...),
    lines: int = Query(100, ge=1, le=1000),
    contains: str | None = Query(None),
    since_ts: float | None = Query(
        None, description="Return empty if log older than this epoch ts"
    ),
) -> dict[str, object]:
    if "/" in source or ".." in source:
        raise HTTPException(status_code=400, detail="invalid source")

    root = _log_root()
    log_path = root / source
    if not log_path.exists():
        raise HTTPException(status_code=404, detail="log source not found")

    if since_ts and log_path.stat().st_mtime < since_ts:
        return {"source": source, "lines": []}

    content = log_path.read_text(encoding="utf-8", errors="ignore").splitlines()
    selected = content[-lines:] if len(content) > lines else content
    if contains:
        selected = [ln for ln in selected if contains.lower() in ln.lower()]
    return {"source": source, "lines": selected}


@router.get("/events")
def consume_events() -> dict[str, object]:
    """Return and clear buffered log/run events for polling UIs."""
    events = log_events.consume()
    return {"events": events}


def _infer_tags(name: str) -> list[str]:
    tags: list[str] = []
    lowered = name.lower()
    if "debug" in lowered:
        tags.append("backend")
    if "llm" in lowered or "transcript" in lowered:
        tags.append("agents")
    if "frontend" in lowered or "vite" in lowered:
        tags.append("frontend")
    if "e2e" in lowered or "playwright" in lowered:
        tags.append("e2e")
    if not tags:
        tags.append("other")
    return tags


async def _event_stream(
    sources: set[str],
    tags: set[str],
    contains: str | None,
    poll_interval: float,
    once: bool,
    tail_lines: int = 0,
) -> AsyncGenerator[str, None]:
    """Async generator yielding SSE events combining log lines and bus events."""
    root = _log_root()
    offsets: dict[str, int] = {}
    
    # Initialize offsets based on tail_lines
    for src in sources:
        path = root / src
        if not path.exists():
            offsets[src] = 0
            continue
        lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
        if tail_lines > 0 and len(lines) > tail_lines:
            offsets[src] = len(lines) - tail_lines
        else:
            offsets[src] = 0

    while True:
        # Emit log lines
        for src in list(offsets.keys()):
            path = root / src
            if not path.exists():
                continue
            lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
            start = offsets.get(src, 0)
            chunk = lines[start:]
            offsets[src] = len(lines)
            for ln in chunk:
                if contains and contains.lower() not in ln.lower():
                    continue
                payload = {"type": "log_line", "source": src, "line": ln}
                yield f"data: {json.dumps(payload)}\n\n"

        # Emit bus events
        events = log_events.consume()
        for ev in events:
            if tags and not any(tag in ev.get("tags", []) for tag in tags):
                # For now, events have no tags; future: add tags
                pass
            yield f"data: {json.dumps(ev)}\n\n"

        if once:
            break
        await asyncio.sleep(poll_interval)


@router.get("/stream")
async def stream_logs(
    sources: str = Query("", description="Comma-separated log source names"),
    tags: str = Query(
        "", description="Comma-separated tags (unused for log files, reserved for events)"
    ),
    contains: str | None = Query(None),
    interval: float = Query(1.0, ge=0.1, le=5.0),
    once: bool = Query(False, description="For tests: end the stream after one poll"),
    tail_lines: int = Query(0, description="Number of lines to tail from existing logs"),
) -> StreamingResponse:
    srcs = {s for s in sources.split(",") if s} or {p.name for p in _log_root().glob("*.log")}
    tag_set = {t for t in tags.split(",") if t}

    async def generator() -> AsyncGenerator[str, None]:
        async for chunk in _event_stream(srcs, tag_set, contains, interval, once, tail_lines):
            yield chunk

    return StreamingResponse(generator(), media_type="text/event-stream")
