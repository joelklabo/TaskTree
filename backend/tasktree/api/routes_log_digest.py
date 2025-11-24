from __future__ import annotations

import os
import time
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, ConfigDict, Field

from tasktree import log_events
from tasktree.log_digest_store import load_history, load_latest, save_digest
from tasktree.run_control import run_control

router = APIRouter()


class DigestBucket(BaseModel):
    hash: str = Field(..., description="Normalized message hash")
    count: int
    message: str
    example: str


class LogDigest(BaseModel):
    window_min: int = Field(..., description="Minutes of log window analyzed")
    total: int = Field(..., description="Total error lines in window")
    generated_at: str | None = Field(None, description="Source timestamp")
    buckets: list[DigestBucket] = Field(default_factory=list)

    model_config = ConfigDict(extra="allow")


def _maybe_trigger_flow(digest: dict[str, Any]) -> tuple[str | None, str | None]:
    flow_id = os.getenv("TASKTREE_LOG_DIGEST_FLOW_ID")
    if not flow_id:
        return None, None
    try:
        controlled = run_control.start_run(flow_id, {"digest": digest}, pause_after=set())
        return controlled.session_id or None, None
    except Exception as exc:  # pragma: no cover - surfaced in logs
        return None, str(exc)


def _render_html(digest: dict[str, Any]) -> str:
    buckets = digest.get("buckets", [])
    rows = "".join(
        f"<tr><td>{b.get('count','')}</td><td>{b.get('hash','')}</td>"
        f"<td>{b.get('message','')}</td><td>{b.get('example','')}</td></tr>"
        for b in buckets
    )
    return f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Log Digest</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 24px; }}
    table {{ border-collapse: collapse; width: 100%; margin-top: 12px; }}
    th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
    th {{ background: #f5f5f5; }}
  </style>
</head>
<body>
  <h1>Log Digest</h1>
  <p><strong>Total:</strong> {digest.get('total','?')} |
     <strong>Window (min):</strong> {digest.get('window_min','?')} |
     <strong>Generated:</strong> {digest.get('generated_at','')} |
     <strong>Received:</strong> {digest.get('received_at','')}</p>
  <table>
    <thead><tr><th>Count</th><th>Hash</th><th>Message</th><th>Example</th></tr></thead>
    <tbody>{rows or '<tr><td colspan=4>No buckets</td></tr>'}</tbody>
  </table>
</body>
</html>
"""


@router.post("/")
def ingest(digest: LogDigest) -> dict[str, Any]:
    record = digest.model_dump()
    record.setdefault("received_at", time.time())
    saved = save_digest(record)
    flow_session_id, flow_error = _maybe_trigger_flow(saved)
    log_events.publish(
        {"type": "log_digest", "flow_session_id": flow_session_id, "digest": saved}
    )
    resp: dict[str, Any] = {"status": "ok", "digest": saved, "flow_session_id": flow_session_id}
    if flow_error:
        resp["flow_error"] = flow_error
    return resp


@router.get("/")
def latest() -> dict[str, Any]:
    digest = load_latest()
    if not digest:
        raise HTTPException(status_code=404, detail="no digest stored")
    return {"digest": digest}


@router.get("/history")
def history(limit: int = Query(20, ge=1, le=200)) -> dict[str, Any]:
    return {"items": load_history(limit)}


@router.get("/view", response_class=HTMLResponse)
def view() -> HTMLResponse:
    digest = load_latest()
    if not digest:
        return HTMLResponse("No digest stored yet.", status_code=200)
    return HTMLResponse(_render_html(digest))
