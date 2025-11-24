"""Simple in-process log/run event bus for UI polling."""

from __future__ import annotations

import threading
from collections import deque
from typing import Any

_events: deque[dict[str, Any]] = deque()
_lock = threading.Lock()


def publish(event: dict[str, Any]) -> None:
    with _lock:
        _events.append(event)


def consume() -> list[dict[str, Any]]:
    with _lock:
        items = list(_events)
        _events.clear()
        return items
