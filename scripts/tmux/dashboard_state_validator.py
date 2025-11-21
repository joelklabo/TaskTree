#!/usr/bin/env python3
"""
Validate dashboard_state.json against dashboard_state.schema.json.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict

def main() -> int:
    root = Path(__file__).resolve().parents[2]
    state_path = Path(sys.argv[1]) if len(sys.argv) > 1 else root / "tmp" / "dashboard_state.json"
    schema_path = Path(sys.argv[2]) if len(sys.argv) > 2 else root / "scripts" / "tmux" / "dashboard_state.schema.json"
    if not state_path.exists():
        print(f"state missing: {state_path}")
        return 1
    if not schema_path.exists():
        print(f"schema missing: {schema_path}")
        return 1
    state = json.loads(state_path.read_text())
    schema = json.loads(schema_path.read_text())

    errors = []
    required_top = schema.get("required", [])
    missing_top = [k for k in required_top if k not in state]
    if missing_top:
        errors.append(f"missing required top-level keys: {missing_top}")

    def require_keys(obj: Dict[str, Any], keys, ctx: str):
        for k in keys:
            if k not in obj:
                errors.append(f"{ctx} missing {k}")

    # status
    status = state.get("status", {})
    if not isinstance(status, dict):
        errors.append("status is not object")
    else:
        require_keys(status, ["env", "ready"], "status")
        if "ready" in status and not isinstance(status["ready"], bool):
            errors.append("status.ready not bool")

    # git
    git = state.get("git", {})
    if not isinstance(git, dict):
        errors.append("git is not object")
    else:
        require_keys(git, ["branch", "ahead", "behind", "dirty"], "git")

    # servers
    servers = state.get("servers", [])
    if not isinstance(servers, list) or not servers:
        errors.append("servers must be a non-empty list")
    else:
        for srv in servers:
            if not isinstance(srv, dict):
                errors.append(f"server entry not object: {srv}")
                continue
            require_keys(srv, ["name", "status", "port"], "server")
            if "status" in srv and not isinstance(srv["status"], bool):
                errors.append(f"server status not bool: {srv}")
            if "port" in srv:
                try:
                    int(srv["port"])
                except Exception:
                    errors.append(f"server port not int: {srv}")

    alerts = state.get("alerts", {})
    if not isinstance(alerts, dict):
        errors.append("alerts is not object")
    else:
        require_keys(alerts, ["total", "recent", "recent_text"], "alerts")
        if "recent" in alerts and not isinstance(alerts["recent"], list):
            errors.append("alerts.recent not list")
        if "recent" in alerts and isinstance(alerts["recent"], list):
            for item in alerts["recent"]:
                if not isinstance(item, dict):
                    errors.append(f"alerts.recent entry not object: {item}")
                    continue
                require_keys(item, ["level", "msg"], "alerts.recent")
        if "recent_text" in alerts and not isinstance(alerts["recent_text"], str):
            errors.append("alerts.recent_text not string")

    ci = state.get("ci", {})
    if not isinstance(ci, dict):
        errors.append("ci is not object")
    else:
        require_keys(ci, ["status", "runs", "recent_text"], "ci")
        if "status" in ci and not isinstance(ci["status"], str):
            errors.append("ci.status not string")
        if "recent_text" in ci and not isinstance(ci["recent_text"], str):
            errors.append("ci.recent_text not string")
        runs = ci.get("runs")
        if runs is None:
            errors.append("ci.runs missing")
        elif not isinstance(runs, list):
            errors.append("ci.runs not list or empty")
        else:
            for run in runs:
                if not isinstance(run, dict):
                    errors.append(f"ci.run not object: {run}")
                    continue
                require_keys(run, ["workflow", "status", "conclusion", "branch"], "ci.run")

    traces = state.get("traces", {})
    if not isinstance(traces, dict):
        errors.append("traces is not object")
    else:
        require_keys(traces, ["recent_runs"], "traces")

    logs = state.get("logs", {})
    if not isinstance(logs, dict):
        errors.append("logs is not object")
    else:
        require_keys(logs, ["configured_sources"], "logs")

    if errors:
        for e in errors:
            print(e)
        return 1
    print("ok: dashboard_state_validator")
    return 0


if __name__ == "__main__":
    sys.exit(main())
