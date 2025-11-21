import argparse
import json
from typing import Any

import yaml

from tasktree.core.executor import run_flow
from tasktree.settings import settings


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


def main() -> int:
    parser = argparse.ArgumentParser(prog="tt", description="TaskTree CLI")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("flows", help="List available flows")

    run_parser = sub.add_parser("run", help="Run a flow")
    run_parser.add_argument("flow_id", help="Flow id (matches config/flows/<id>.yaml)")
    run_parser.add_argument(
        "--input",
        dest="input_json",
        default="{}",
        help="JSON string passed as flow input",
    )

    args = parser.parse_args()

    if args.command == "flows":
        return cmd_list_flows()
    if args.command == "run":
        return cmd_run_flow(args.flow_id, args.input_json)

    parser.print_help()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
