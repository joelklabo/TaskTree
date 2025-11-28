#!/usr/bin/env python3
"""Generate Beads epics/tasks from a feature description.

This helper keeps human/agent workflow consistent:
- Wrap the provided feature description in the Feature Intake template.
- Create an epic plus child tasks seeded with the Bead Task template (includes
  the mandatory Retry Log with 3 attempts).
- Default to a dry-run so tests can assert on the planned artifacts without
  mutating the repo; pass --apply to write via the `bd` CLI.

Usage examples:
  ./scripts/feature_to_beads.py --title "Search facets" --description "..." --apply
  ./scripts/feature_to_beads.py --title "Offline mode" --description-file spec.md --tasks "Discovery,API,UI,Testing" --apply

The script requires the `bd` CLI when --apply is used. Dry-run mode only
depends on the templates under docs/templates/.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from textwrap import dedent
from typing import List


REPO_ROOT = Path(__file__).resolve().parent.parent
TEMPLATES_DIR = REPO_ROOT / "docs" / "templates"

DEFAULT_TASKS = [
    "Discovery/Research",
    "Design (if needed)",
    "Implementation",
    "Testing & Validation",
    "Docs & Rollout",
]


@dataclass
class PlannedTask:
    title: str
    description: str


@dataclass
class Plan:
    epic_title: str
    epic_description: str
    tasks: List[PlannedTask]


def _read_feature_text(args: argparse.Namespace) -> str:
    if args.description and args.description_file:
        raise SystemExit("Provide either --description or --description-file, not both")
    if args.description_file:
        return Path(args.description_file).read_text().strip()
    if args.description:
        return args.description.strip()
    return sys.stdin.read().strip()


def _load_template(name: str) -> str:
    path = TEMPLATES_DIR / name
    if not path.exists():
        raise SystemExit(f"Template missing: {path}")
    return path.read_text().strip()


def build_plan(args: argparse.Namespace) -> Plan:
    feature_text = _read_feature_text(args) or "(fill in feature details)"
    tasks = [t.strip() for t in args.tasks.split(",") if t.strip()] or DEFAULT_TASKS

    feature_template = _load_template("feature-intake-template.md")
    task_template = _load_template("bead-task-template.md")

    epic_body = (
        f"""# Feature Intake (auto-generated)

## Provided spec
{feature_text}

---
{feature_template}
"""
    ).strip()

    planned_tasks: List[PlannedTask] = []
    for task in tasks:
        desc = (
            f"""# {task}

Context: {args.title}

{task_template}
"""
        ).strip()
        planned_tasks.append(PlannedTask(title=task, description=desc))

    return Plan(epic_title=args.title, epic_description=epic_body, tasks=planned_tasks)


def _run_bd(cmd: list[str]) -> str:
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
    except FileNotFoundError as exc:  # pragma: no cover - exercised in runtime
        raise SystemExit("bd CLI not found; install beads first") from exc
    return result.stdout


def _extract_issue_id(output: str) -> str:
    """Extract the created issue id from bd --json output or plain text."""
    output = output.strip()
    if not output:
        raise ValueError("bd output empty; cannot determine issue id")
    try:
        data = json.loads(output)
        if isinstance(data, list) and data:
            return data[0]["id"]
        if isinstance(data, dict) and "id" in data:
            return data["id"]
    except json.JSONDecodeError:
        pass
    match = re.search(r"([A-Za-z0-9_-]+-\d+(?:\.\d+)?)", output)
    if match:
        return match.group(1)
    raise ValueError(f"Could not parse issue id from bd output: {output}")


def apply_plan(plan: Plan, args: argparse.Namespace) -> None:
    bd_base = ["bd", "create", "--json", "-p", args.priority]
    if args.labels:
        bd_base += ["-l", args.labels]
    if args.db:
        bd_base += ["--db", args.db]

    epic_cmd = bd_base + ["-t", "epic", "--title", plan.epic_title, "-d", plan.epic_description]
    epic_output = _run_bd(epic_cmd)
    epic_id = _extract_issue_id(epic_output)

    print(f"Created epic {epic_id}: {plan.epic_title}")

    for task in plan.tasks:
        task_cmd = bd_base + [
            "-t",
            "task",
            "--title",
            task.title,
            "-d",
            task.description,
            "--parent",
            epic_id,
        ]
        task_output = _run_bd(task_cmd)
        task_id = _extract_issue_id(task_output)
        print(f"  ↳ Created task {task_id}: {task.title}")


def print_dry_run(plan: Plan) -> None:
    print("Dry-run: no Beads were created. Plan preview:\n")
    print(f"Epic: {plan.epic_title}\n---\n{plan.epic_description}\n")
    for idx, task in enumerate(plan.tasks, start=1):
        print(f"Task {idx}: {task.title}\n---\n{task.description}\n")


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create Beads issues from a feature spec")
    parser.add_argument("--title", required=True, help="Epic title")
    parser.add_argument("--description", help="Feature description text")
    parser.add_argument("--description-file", help="Path to feature description file")
    parser.add_argument(
        "--tasks",
        default=",".join(DEFAULT_TASKS),
        help="Comma-separated task titles to create under the epic",
    )
    parser.add_argument("--priority", default="2", help="Beads priority (0-4 or P0-P4)")
    parser.add_argument("--labels", help="Optional labels for created issues (comma-separated)")
    parser.add_argument("--db", help="Optional alternate Beads DB path for tests/sandboxes")
    parser.add_argument("--apply", action="store_true", help="Actually create issues via bd (default: dry-run)")
    parser.add_argument("--dry-run", action="store_true", help="Force dry-run even if --apply is provided elsewhere")
    return parser.parse_args(argv)


def main(argv: list[str]) -> None:
    args = parse_args(argv)
    plan = build_plan(args)
    if args.apply and not args.dry_run:
        apply_plan(plan, args)
    else:
        print_dry_run(plan)


if __name__ == "__main__":
    main(sys.argv[1:])
