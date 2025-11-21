from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

from tasktree.settings import settings


@dataclass
class Constitution:
    ownership: dict[str, str]
    ttl_seconds: int
    renew_interval: int
    max_retries: int
    backoff_seconds: tuple[int, int]
    task_states: dict[str, dict[str, str]]
    protected: list[str]


def load_constitution(path: Path | None = None) -> Constitution:
    path = path or settings.constitution_path
    data: dict[str, Any] = yaml.safe_load(path.read_text())

    leases = data.get("leases", {})
    task_states_section = data.get("task_states", {})
    transitions = task_states_section.get("transitions", {})

    return Constitution(
        ownership=data.get("ownership", {}),
        ttl_seconds=leases.get("ttl_seconds", 90),
        renew_interval=leases.get("renew_interval", 30),
        max_retries=leases.get("max_retries", 3),
        backoff_seconds=tuple(leases.get("backoff_seconds", [5, 20])),
        task_states=transitions,
        protected=data.get("protected", []),
    )


_constitution: Constitution | None = None


def constitution() -> Constitution:
    global _constitution
    if _constitution is None:
        _constitution = load_constitution()
    return _constitution


def next_state(current: str, event: str) -> str | None:
    transitions = constitution().task_states.get(current, {})
    return transitions.get(event)
