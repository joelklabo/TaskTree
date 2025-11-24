import argparse
import asyncio
import json
import os
import time
from pathlib import Path
from typing import Any

import yaml

from tasktree.core.executor import run_flow
from tasktree.log_catalog import describe_log
from tasktree.settings import settings

COLORS = [
    "\033[36m",  # Cyan
    "\033[32m",  # Green
    "\033[33m",  # Yellow
    "\033[34m",  # Blue
    "\033[35m",  # Magenta
]
RESET = "\033[0m"


def cmd_list_flows() -> int:
    flows = []
    for path in settings.flows_dir.glob("*.yaml"):
        loaded = yaml.safe_load(path.read_text())
        flows.append({"id": loaded.get("id"), "description": loaded.get("description", "")})
    for f in flows:
        print(f"{f['id']}: {f['description']}")
    return 0


def cmd_run_flow(flow_id: str, input_json: str) -> int:
    try:
        payload: dict[str, Any] = json.loads(input_json) if input_json else {}
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid JSON for --input: {exc}") from exc

    session = run_flow(flow_id, payload)
    print(f"Session: {session.session_id}")
    for step in session.steps:
        print(
            f"- {step.step_name} [{step.agent_name}] -> {step.result.status.value}"
            + (f" ({step.result.label})" if step.result.label else "")
        )
    return 0


def _log_root() -> Path:
    env_root = os.getenv("TASKTREE_LOG_ROOT")
    if env_root:
        return Path(env_root)
    return Path(__file__).resolve().parents[2] / "logs"


def cmd_logs_list() -> int:
    root = _log_root()
    root.mkdir(parents=True, exist_ok=True)
    for path in sorted(root.glob("*.log")):
        stat = path.stat()
        desc = describe_log(path.name)
        print(
            f"{path.name}\t{stat.st_size} bytes\t"
            f"{time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(stat.st_mtime))}\t{desc}"
        )
    return 0


def _tail_file(path: Path, lines: int, contains: str | None) -> list[str]:
    content = path.read_text(encoding="utf-8", errors="ignore").splitlines()
    selected = content[-lines:] if len(content) > lines else content
    if contains:
        selected = [ln for ln in selected if contains.lower() in ln.lower()]
    return selected


def cmd_logs_tail(
    source: str, lines: int, contains: str | None, follow: bool, interval: float
) -> int:
    root = _log_root()
    path = root / source
    if not path.exists():
        print(f"Log source not found: {source}")
        return 1

    already = 0
    while True:
        selected = _tail_file(path, lines, contains)
        new = selected[already:] if follow else selected
        for line in new:
            print(line)
        already = len(selected)
        if not follow:
            break
        time.sleep(interval)
    return 0


async def _watch_stream(
    sources: list[str],
    tags: list[str],
    contains: str | None,
    interval: float,
    once: bool,
    tail_lines: int,
) -> int:
    from tasktree.api import (
        routes_logs,
    )  # inline import to avoid API dependency at module import time

    src_set = set(sources) if sources else {p.name for p in _log_root().glob("*.log")}
    tag_set = set(tags)

    async for chunk in routes_logs._event_stream(
        sources=src_set,
        tags=tag_set,
        contains=contains,
        poll_interval=interval,
        once=once,
        tail_lines=tail_lines,
    ):
        # chunk is already JSON-wrapped as SSE payload ("data: {...}")
        text = chunk.strip()
        if not text.startswith("data: "):
            continue
        payload = json.loads(text[len("data: ") :])
        if payload.get("type") == "log_line":
            src = payload.get("source", "?")
            line = payload.get("line", "")
            color = COLORS[hash(src) % len(COLORS)]
            print(f"{color}[{src}]{RESET} {line}")
        else:
            print(f"[event] {payload}")
    return 0


def cmd_logs_watch(
    sources: list[str],
    tags: list[str],
    contains: str | None,
    interval: float,
    once: bool,
    tail_lines: int,
) -> int:
    root = _log_root()
    root.mkdir(parents=True, exist_ok=True)
    print("Watching logs via TaskTree stream...")
    return asyncio.run(_watch_stream(sources, tags, contains, interval, once, tail_lines))


def main() -> int:
    parser = argparse.ArgumentParser(prog="tt", description="TaskTree CLI")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("flows", help="List available flows")
    
    # Shortcut for logs watch
    watch_parser = sub.add_parser("watch", help="Stream logs (shortcut for 'logs watch')")
    watch_parser.add_argument(
        "--sources",
        type=str,
        default="",
        help="Comma-separated log sources (default: all discovered)",
    )
    watch_parser.add_argument(
        "--tags",
        type=str,
        default="",
        help="Comma-separated tags (reserved for future event tagging)",
    )
    watch_parser.add_argument(
        "--contains",
        type=str,
        default=None,
        help="Filter lines containing text",
    )
    watch_parser.add_argument(
        "--interval",
        type=float,
        default=1.0,
        help="Poll interval seconds (default 1.0)",
    )
    watch_parser.add_argument(
        "--once",
        action="store_true",
        help="Read a single stream pass then exit (useful for scripting/tests)",
    )
    watch_parser.add_argument(
        "--lines",
        type=int,
        default=50,
        help="Number of lines to tail from existing logs (default: 50)",
    )

    run_parser = sub.add_parser("run", help="Run a flow")
    run_parser.add_argument("flow_id", help="Flow id (matches config/flows/<id>.yaml)")
    run_parser.add_argument(
        "--input",
        dest="input_json",
        default="{}",
        help="JSON string passed as flow input",
    )

    logs = sub.add_parser("logs", help="Log utilities")
    logs_sub = logs.add_subparsers(dest="logs_cmd", required=True)
    logs_sub.add_parser("ls", help="List log sources")
    tail = logs_sub.add_parser("tail", help="Tail a log source")
    tail.add_argument("source", help="Log source name (e.g., debug.log)")
    tail.add_argument("--lines", type=int, default=200, help="Number of lines to show")
    tail.add_argument("--contains", type=str, default=None, help="Filter lines containing text")
    tail.add_argument("--follow", action="store_true", help="Follow the log (like tail -f)")
    tail.add_argument("--interval", type=float, default=1.0, help="Follow poll interval seconds")
    watch = logs_sub.add_parser("watch", help="Stream logs and events via TaskTree")
    watch.add_argument(
        "--sources",
        type=str,
        default="",
        help="Comma-separated log sources (default: all discovered)",
    )
    watch.add_argument(
        "--tags",
        type=str,
        default="",
        help="Comma-separated tags (reserved for future event tagging)",
    )
    watch.add_argument("--contains", type=str, default=None, help="Filter lines containing text")
    watch.add_argument(
        "--interval",
        type=float,
        default=1.0,
        help="Poll interval seconds (default 1.0)",
    )
    watch.add_argument(
        "--once",
        action="store_true",
        help="Read a single stream pass then exit (useful for scripting/tests)",
    )
    watch.add_argument(
        "--lines",
        type=int,
        default=50,
        help="Number of lines to tail from existing logs (default: 50)",
    )

    args = parser.parse_args()

    if args.command == "flows":
        return cmd_list_flows()
    if args.command == "watch":
        srcs = [s for s in args.sources.split(",") if s]
        tags = [t for t in args.tags.split(",") if t]
        return cmd_logs_watch(
            srcs, tags, args.contains, args.interval, args.once, args.lines
        )
    if args.command == "run":
        return cmd_run_flow(args.flow_id, args.input_json)
    if args.command == "logs":
        if args.logs_cmd == "ls":
            return cmd_logs_list()
        if args.logs_cmd == "tail":
            return cmd_logs_tail(args.source, args.lines, args.contains, args.follow, args.interval)
        if args.logs_cmd == "watch":
            srcs = [s for s in args.sources.split(",") if s]
            tags = [t for t in args.tags.split(",") if t]
            return cmd_logs_watch(
                srcs, tags, args.contains, args.interval, args.once, args.lines
            )

    parser.print_help()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
