import textwrap
from pathlib import Path

import pytest

import tasktree.coord.constitution as const_mod
from tasktree.core.executor import run_flow
from tasktree.settings import settings


def _write_flow(tmp_flow_dir: Path, flow_id: str, resources: list[str]) -> None:
    yaml_text = textwrap.dedent(
        f"""
        id: {flow_id}
        version: "1.0.0"
        description: "Test flow"
        start: plan
        steps:
          - id: plan
            agent: codex_cli
            action: plan_bugfix
            resources: []
            transitions:
              success: implement
          - id: implement
            agent: codex_cli
            action: implement_fix
            resources: {resources}
            transitions:
              success: test
          - id: test
            agent: codex_cli
            action: run_tests
            resources: []
            transitions:
              tests_passed: end
        """
    ).strip()
    (tmp_flow_dir / f"{flow_id}.yaml").write_text(yaml_text)


def test_run_flow_happy_path(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    original_flows = settings.flows_dir
    const_mod._constitution = None
    try:
        monkeypatch.setattr(settings, "flows_dir", tmp_path)
        _write_flow(tmp_path, "sample", [])

        session = run_flow("sample", {})

        assert session.flow_name == "sample"
        assert [s.step_name for s in session.steps] == ["plan", "implement", "test"]
        assert session.steps[-1].result.label == "tests_passed"
    finally:
        monkeypatch.setattr(settings, "flows_dir", original_flows)
        const_mod._constitution = None


def test_protected_resource_denied(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    original_flows = settings.flows_dir
    original_const = settings.constitution_path
    const_mod._constitution = None

    tmp_const = tmp_path / "constitution.yaml"
    tmp_const.write_text(
        textwrap.dedent(
            """
            ownership:
              "tasktree/config/flows/": planner
            leases:
              ttl_seconds: 90
              renew_interval: 30
              max_retries: 1
              backoff_seconds: [0, 0]
            task_states:
              transitions: {}
            protected:
              - "tasktree/config/flows/"
            """
        ).strip()
    )

    try:
        monkeypatch.setattr(settings, "flows_dir", tmp_path)
        monkeypatch.setattr(settings, "constitution_path", tmp_const)
        const_mod._constitution = None

        _write_flow(tmp_path, "protected_flow", ["tasktree/config/flows/"])

        with pytest.raises(PermissionError):
            run_flow("protected_flow", {})
    finally:
        monkeypatch.setattr(settings, "flows_dir", original_flows)
        monkeypatch.setattr(settings, "constitution_path", original_const)
        const_mod._constitution = None


def test_missing_flow_file_raises(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    original_flows = settings.flows_dir
    try:
        monkeypatch.setattr(settings, "flows_dir", tmp_path)
        with pytest.raises(FileNotFoundError):
            run_flow("nope", {})
    finally:
        monkeypatch.setattr(settings, "flows_dir", original_flows)


def test_missing_transition_raises(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    original_flows = settings.flows_dir
    const_mod._constitution = None
    try:
        monkeypatch.setattr(settings, "flows_dir", tmp_path)
        _write_flow(tmp_path, "bad_flow", [])
        (tmp_path / "bad_flow.yaml").write_text(
            textwrap.dedent(
                """
                id: bad_flow
                version: "1.0.0"
                description: "bad transitions"
                start: plan
                steps:
                  - id: plan
                    agent: codex_cli
                    action: plan_bugfix
                    resources: []
                    transitions:
                      unknown_label: end
                """
            ).strip()
        )

        with pytest.raises(RuntimeError):
            run_flow("bad_flow", {})
    finally:
        monkeypatch.setattr(settings, "flows_dir", original_flows)
        const_mod._constitution = None


def test_missing_agent_registration(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    from tasktree.agents import base as agents_base

    original_flows = settings.flows_dir
    saved_factories = dict(agents_base.registry._factories)
    try:
        agents_base.registry._factories.clear()
        monkeypatch.setattr(settings, "flows_dir", tmp_path)
        _write_flow(
            tmp_path,
            "agentless",
            [],
        )
        (tmp_path / "agentless.yaml").write_text(
            textwrap.dedent(
                """
                id: agentless
                version: "1.0.0"
                description: "no agent"
                start: plan
                steps:
                  - id: plan
                    agent: codex_cli
                    action: plan_bugfix
                    resources: []
                    transitions:
                      success: end
                """
            ).strip()
        )

        with pytest.raises(KeyError):
            run_flow("agentless", {})
    finally:
        agents_base.registry._factories = saved_factories
        monkeypatch.setattr(settings, "flows_dir", original_flows)
