from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from enum import Enum
from typing import Any
from uuid import uuid4


class StepStatus(str, Enum):
    SUCCESS = "success"
    FAILURE = "failure"


@dataclass
class TaskResult:
    status: StepStatus
    output: str
    metrics: dict[str, float]
    learnings: list[str]
    label: str | None = None  # e.g. "tests_passed", "tests_failed"


@dataclass
class StepRecord:
    session_id: str
    flow_name: str
    flow_version: str
    step_name: str
    agent_name: str
    prompt: str
    raw_response: str
    parsed: dict[str, Any]
    result: TaskResult
    ts_utc: str


@dataclass
class SessionRecord:
    session_id: str
    flow_name: str
    flow_version: str
    strategies_applied: list[str]
    steps: list[StepRecord]


def now_utc_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()


def new_session(flow_name: str, flow_version: str) -> SessionRecord:
    return SessionRecord(
        session_id=uuid4().hex,
        flow_name=flow_name,
        flow_version=flow_version,
        strategies_applied=[],
        steps=[],
    )


def step_record_dict(step: StepRecord) -> dict[str, Any]:
    d = asdict(step)
    d["result"]["status"] = step.result.status.value
    return d
