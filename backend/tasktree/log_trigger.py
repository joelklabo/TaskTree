"""Log-triggered flow runner glue for local development.

Starts a `LogWatcher` on configured paths, matches error patterns, rate-limits per file,
and invokes a TaskTree flow (default: log_error_handler) with context.
"""

from __future__ import annotations

import json
import subprocess  # nosec B404 - subprocess is required to invoke TaskTree flow CLI
import time
from collections.abc import Callable, Iterable
from dataclasses import dataclass
from pathlib import Path

from tasktree.log_watcher import LogEvent, LogWatcher

FlowRunner = Callable[[dict], None]


@dataclass
class TriggerConfig:
    paths: list[Path]
    patterns: list[str]
    flow_id: str = "log_error_handler"
    poll_seconds: float = 0.25
    min_interval_seconds: float = 30.0
    dry_run: bool = False
    context_lines: int = 3
    log_destination: Path | None = None


class LogTrigger:
    """Coordinates LogWatcher events with a flow runner."""

    def __init__(self, config: TriggerConfig, flow_runner: FlowRunner | None = None) -> None:
        self.config = config
        self._runner = flow_runner or self._default_runner
        self._last_trigger: dict[Path, float] = {}
        self._watcher = LogWatcher(
            paths=[str(p) for p in config.paths],
            patterns=config.patterns,
            poll_seconds=config.poll_seconds,
        )

    def start(self) -> None:
        self._watcher.start(self._on_event)

    def stop(self) -> None:
        self._watcher.stop()

    def _on_event(self, event: LogEvent) -> None:
        now = time.monotonic()
        last = self._last_trigger.get(event.path, 0.0)
        if (now - last) < self.config.min_interval_seconds:
            return
        self._last_trigger[event.path] = now

        context = self._gather_context(event.path, event.lineno, self.config.context_lines)
        payload = {
            "file": str(event.path),
            "lineno": event.lineno,
            "line": event.line,
            "pattern": event.matched_pattern,
            "context": context,
        }
        self._log_local(f"Triggering {self.config.flow_id}: {payload}")
        if self.config.dry_run:
            print(f"[dry-run] Would trigger flow {self.config.flow_id} with {payload}")
            return
        self._runner(payload)

    def _default_runner(self, payload: dict) -> None:
        cmd = [
            "uv",
            "run",
            "tt",
            "run",
            self.config.flow_id,
            "--input",
            json.dumps(payload),
        ]
        # Input is structured JSON for the flow; shell stays disabled.
        subprocess.run(cmd, check=True, shell=False, cwd=Path(__file__).resolve().parent)  # nosec B603

    def _gather_context(self, path: Path, lineno: int, radius: int) -> dict[str, Iterable[str]]:
        if radius <= 0 or not path.exists():
            return {"before": [], "after": []}
        lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
        idx = lineno - 1
        before = lines[max(0, idx - radius):idx]
        after = lines[idx + 1: idx + 1 + radius]
        return {"before": before, "after": after}

    def _log_local(self, message: str) -> None:
        dest = self.config.log_destination
        if not dest:
            return
        dest.parent.mkdir(parents=True, exist_ok=True)
        ts = time.strftime("%Y-%m-%dT%H:%M:%S")
        with dest.open("a", encoding="utf-8") as fh:
            fh.write(f"{ts} {message}\n")


def main(argv: list[str] | None = None) -> int:
    import argparse

    parser = argparse.ArgumentParser(description="Watch logs and trigger TaskTree flows.")
    parser.add_argument(
        "--paths",
        nargs="+",
        default=["tmp/dev-app.log"],
        help="Log file paths to watch (default: tmp/dev-app.log)",
    )
    parser.add_argument(
        "--patterns",
        nargs="+",
        default=[r"ERROR", r"Exception", r"Traceback"],
        help="Regex patterns that trigger the flow",
    )
    parser.add_argument("--flow-id", default="log_error_handler", help="Flow id to run on match")
    parser.add_argument("--interval", type=float, default=0.25, help="Poll interval in seconds")
    parser.add_argument(
        "--min-interval",
        type=float,
        default=30.0,
        help="Minimum seconds between triggers per file",
    )
    parser.add_argument("--dry-run", action="store_true", help="Log triggers without running flows")
    parser.add_argument(
        "--context-lines",
        type=int,
        default=3,
        help="Number of lines before/after the match to include in context",
    )
    parser.add_argument(
        "--log-dest",
        type=Path,
        default=None,
        help="Optional local log file to append trigger summaries to",
    )
    args = parser.parse_args(argv)

    config = TriggerConfig(
        paths=[Path(p) for p in args.paths],
        patterns=list(args.patterns),
        flow_id=args.flow_id,
        poll_seconds=args.interval,
        min_interval_seconds=args.min_interval,
        dry_run=args.dry_run,
        context_lines=args.context_lines,
        log_destination=args.log_dest,
    )
    trigger = LogTrigger(config=config)
    trigger.start()
    try:
        while True:
            time.sleep(1.0)
    except KeyboardInterrupt:
        trigger.stop()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
