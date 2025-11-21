"""
Lightweight log watcher for local development.

Usage (example):
    from tasktree.log_watcher import LogWatcher, LogEvent
    watcher = LogWatcher(paths=["/tmp/app.log"], patterns=[r"ERROR", r"Exception"])
    watcher.start(on_event=lambda ev: print(ev))
    ...
    watcher.stop()

The watcher polls files (no inotify dependency), keeping track of per-file offsets
and only emitting events for new matching lines. Designed for local triggers.
"""

from __future__ import annotations

import re
import threading
import time
from collections.abc import Callable, Iterable
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class LogEvent:
    path: Path
    line: str
    lineno: int
    matched_pattern: str


class LogWatcher:
    def __init__(
        self,
        paths: Iterable[str],
        patterns: Iterable[str],
        poll_seconds: float = 0.2,
    ) -> None:
        self.paths: list[Path] = [Path(p) for p in paths]
        self.patterns: list[re.Pattern[str]] = [re.compile(p) for p in patterns]
        self.poll_seconds = poll_seconds
        self._offsets: dict[Path, int] = {}
        self._linenos: dict[Path, int] = {}
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self, on_event: Callable[[LogEvent], None]) -> None:
        if self._thread and self._thread.is_alive():
            return

        def loop() -> None:
            while not self._stop.is_set():
                self._poll(on_event)
                time.sleep(self.poll_seconds)

        self._thread = threading.Thread(target=loop, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=self.poll_seconds * 5)

    def _poll(self, on_event: Callable[[LogEvent], None]) -> None:
        for path in self.paths:
            if not path.exists() or not path.is_file():
                continue

            # Initialize tracking if needed.
            if path not in self._offsets:
                self._offsets[path] = 0
                self._linenos[path] = 0

            # Ensure offsets do not exceed file size after truncation/rotation.
            size = path.stat().st_size
            if self._offsets[path] > size:
                self._offsets[path] = 0
                self._linenos[path] = 0

            with path.open("r", encoding="utf-8") as fh:
                fh.seek(self._offsets[path])
                for raw_line in fh:
                    line = raw_line.rstrip("\n")
                    self._linenos[path] += 1
                    for pattern in self.patterns:
                        if pattern.search(line):
                            on_event(
                                LogEvent(
                                    path=path,
                                    line=line,
                                    lineno=self._linenos[path],
                                    matched_pattern=pattern.pattern,
                                )
                            )
                            break
                self._offsets[path] = fh.tell()
