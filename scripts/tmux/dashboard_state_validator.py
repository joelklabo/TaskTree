#!/usr/bin/env python3
"""
Validate dashboard_state.json against dashboard_state.schema.json.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict


def _is_int(val: Any) -> bool:
    return isinstance(val, int) and not isinstance(val, bool)


def _check_str(obj: Dict[str, Any], key: str, ctx: str, errors: list[str]) -> None:
    if key in obj and not isinstance(obj[key], str):
        errors.append(f"{ctx}.{key} not string")


def _check_int(obj: Dict[str, Any], key: str, ctx: str, errors: list[str]) -> None:
    if key in obj and not _is_int(obj[key]):
        errors.append(f"{ctx}.{key} not int")

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
        _check_str(status, "env", "status", errors)
        _check_str(status, "updated_at", "status", errors)
        if "ready" in status and not isinstance(status["ready"], bool):
            errors.append("status.ready not bool")

    # git
    git = state.get("git", {})
    if not isinstance(git, dict):
        errors.append("git is not object")
    else:
        require_keys(git, ["branch", "ahead", "behind", "dirty"], "git")
        _check_str(git, "branch", "git", errors)
        _check_int(git, "ahead", "git", errors)
        _check_int(git, "behind", "git", errors)
        _check_int(git, "dirty", "git", errors)

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
            _check_str(srv, "name", "server", errors)
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
                _check_str(item, "level", "alerts.recent", errors)
                _check_str(item, "msg", "alerts.recent", errors)
                _check_str(item, "source", "alerts.recent", errors)
                _check_int(item, "count", "alerts.recent", errors)
        if "recent_text" in alerts and not isinstance(alerts["recent_text"], str):
            errors.append("alerts.recent_text not string")
        _check_int(alerts, "total", "alerts", errors)

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
                _check_str(run, "workflow", "ci.run", errors)
                _check_str(run, "status", "ci.run", errors)
                _check_str(run, "conclusion", "ci.run", errors)
                _check_str(run, "branch", "ci.run", errors)
                _check_str(run, "url", "ci.run", errors)
                _check_str(run, "updated_at", "ci.run", errors)

    traces = state.get("traces", {})
    if not isinstance(traces, dict):
        errors.append("traces is not object")
    else:
        require_keys(traces, ["recent_runs"], "traces")
        _check_int(traces, "recent_runs", "traces", errors)

    logs = state.get("logs", {})
    if not isinstance(logs, dict):
        errors.append("logs is not object")
    else:
        require_keys(logs, ["configured_sources"], "logs")
        _check_int(logs, "configured_sources", "logs", errors)

    if errors:
        for e in errors:
            print(e)
        return 1
    print("ok: dashboard_state_validator")
    return 0


if __name__ == "__main__":
    sys.exit(main())
