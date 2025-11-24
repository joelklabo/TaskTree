from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Any


def _log_dir() -> Path:
    env_root = os.getenv("TASKTREE_LOG_ROOT")
    return Path(env_root) if env_root else Path(__file__).resolve().parents[2] / "logs"


LATEST_NAME = "log_digest_latest.json"
HISTORY_NAME = "log_digest_history.jsonl"


def save_digest(digest: dict[str, Any]) -> dict[str, Any]:
    """Persist the digest as latest and append to history."""
    log_dir = _log_dir()
    log_dir.mkdir(parents=True, exist_ok=True)

    record = dict(digest)
    record.setdefault("received_at", time.time())

    latest_path = log_dir / LATEST_NAME
    history_path = log_dir / HISTORY_NAME

    latest_path.write_text(json.dumps(record, indent=2))
    with history_path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(record) + "\n")
    _trim_history(history_path, max_entries=200)
    return record


def load_latest() -> dict[str, Any] | None:
    log_dir = _log_dir()
    latest_path = log_dir / LATEST_NAME
    if not latest_path.exists():
        return None
    try:
        parsed = json.loads(latest_path.read_text())
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        return None


def load_history(limit: int = 50) -> list[dict[str, Any]]:
    log_dir = _log_dir()
    history_path = log_dir / HISTORY_NAME
    if not history_path.exists():
        return []
    lines = history_path.read_text(encoding="utf-8", errors="ignore").splitlines()
    selected = lines[-limit:]
    records: list[dict[str, Any]] = []
    for line in selected:
        try:
            records.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return records


def _trim_history(path: Path, max_entries: int) -> None:
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except FileNotFoundError:
        return
    if len(lines) <= max_entries:
        return
    trimmed = lines[-max_entries:]
    path.write_text("\n".join(trimmed) + "\n")
