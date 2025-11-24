
from tasktree.core.executor import run_flow


def test_flow_structure_allows_retry(monkeypatch, tmp_path):
    """Ensure implement_feature_iterative flow loops on needs_retry and stops after issue/commit."""
    # Minimal mock flow files and agent behavior
    flow_input = {"feature_spec": "demo", "retry_count": 0, "max_retries": 2}

    # Mock load_flow to inject transitions without touching FS
    from tasktree.core import executor

    flow_def = executor.FlowDef(
        id="implement_feature_iterative",
        version="0.1.0",
        description="",
        start="research",
        steps={
            "research": executor.StepDef(
                name="research",
                agent="mock_agent",
                action="research_feature",
                resources=[],
                transitions={"planned": "build_tests"},
            ),
            "build_tests": executor.StepDef(
                name="build_tests",
                agent="mock_agent",
                action="build_failing_tests",
                resources=[],
                transitions={"tests_ready": "implement"},
            ),
            "implement": executor.StepDef(
                name="implement",
                agent="mock_agent",
                action="implement_feature_iterative",
                resources=[],
                transitions={
                    "implemented": "commit",
                    "needs_retry": "implement",
                    "issue_needed": "issue",
                },
            ),
            "issue": executor.StepDef(
                name="issue",
                agent="mock_agent",
                action="create_feature_issue",
                resources=[],
                transitions={"issue_created": "end"},
            ),
            "commit": executor.StepDef(
                name="commit",
                agent="mock_agent",
                action="commit_feature",
                resources=[],
                transitions={"committed": "end"},
            ),
        },
    )

    calls = []

    def fake_load_flow(flow_id: str):
        assert flow_id == "implement_feature_iterative"
        return flow_def

    def fake_agent_factory(agent_id: str, cfg: dict):
        class Dummy:
            def __init__(self):
                self.id = "mock_agent"

            def run_step(self, action: str, ctx):
                calls.append(action)
                # First implement attempt fails and requests retry, second succeeds
                if action == "implement_feature_iterative":
                    if calls.count("implement_feature_iterative") == 1:
                        return _out("needs_retry")
                    return _out("implemented")
                if action == "create_feature_issue":
                    return _out("issue_created")
                if action == "commit_feature":
                    return _out("committed")
                if action == "research_feature":
                    return _out("planned")
                if action == "build_failing_tests":
                    return _out("tests_ready")
                return _out("success")

        return Dummy()

    def _out(label: str):
        from tasktree.agents.base import AgentOutput
        from tasktree.core.state import StepStatus, TaskResult

        return AgentOutput(
            prompt="p",
            raw_response="r",
            parsed={},
            result=TaskResult(
                status=StepStatus.SUCCESS,
                output="ok",
                metrics={},
                learnings=[],
                label=label,
            ),
        )

    monkeypatch.setattr(executor, "load_flow", fake_load_flow)
    monkeypatch.setattr(executor.registry, "create", fake_agent_factory)
    # Ensure agent config path exists
    dummy_cfg = tmp_path / "mock_agent.yaml"
    dummy_cfg.write_text("id: mock_agent")
    monkeypatch.setattr(executor.settings, "agents_dir", tmp_path)

    session = run_flow("implement_feature_iterative", flow_input)
    # Ensure we looped and eventually committed
    assert calls.count("implement_feature_iterative") == 2
    assert calls[-1] == "commit_feature"
    assert session.steps[-1].result.label in {"committed", "success"}


def test_flow_hits_issue_when_max_retries_exceeded(monkeypatch, tmp_path):
    """If implementer keeps returning needs_retry beyond max, we route to issue."""
    flow_input = {"feature_spec": "demo", "retry_count": 0, "max_retries": 1}

    from tasktree.core import executor

    flow_def = executor.FlowDef(
        id="implement_feature_iterative",
        version="0.1.0",
        description="",
        start="research",
        steps={
            "research": executor.StepDef(
                name="research",
                agent="mock_agent",
                action="research_feature",
                resources=[],
                transitions={"planned": "build_tests"},
            ),
            "build_tests": executor.StepDef(
                name="build_tests",
                agent="mock_agent",
                action="build_failing_tests",
                resources=[],
                transitions={"tests_ready": "implement"},
            ),
            "implement": executor.StepDef(
                name="implement",
                agent="mock_agent",
                action="implement_feature_iterative",
                resources=[],
                transitions={
                    "implemented": "commit",
                    "needs_retry": "implement",
                    "issue_needed": "issue",
                },
            ),
            "issue": executor.StepDef(
                name="issue",
                agent="mock_agent",
                action="create_feature_issue",
                resources=[],
                transitions={"issue_created": "end"},
            ),
        },
    )

    calls = []

    def fake_load_flow(flow_id: str):
        return flow_def

    def fake_agent_factory(agent_id: str, cfg: dict):
        class Dummy:
            def __init__(self):
                self.id = "mock_agent"

            def run_step(self, action: str, ctx):
                calls.append(action)
                if action == "research_feature":
                    return _out("planned")
                if action == "build_failing_tests":
                    return _out("tests_ready")
                if action == "implement_feature_iterative":
                    return _out("needs_retry")
                if action == "create_feature_issue":
                    return _out("issue_created")
                return _out("success")

        return Dummy()

    def _out(label: str):
        from tasktree.agents.base import AgentOutput
        from tasktree.core.state import StepStatus, TaskResult

        return AgentOutput(
            prompt="p",
            raw_response="r",
            parsed={},
            result=TaskResult(
                status=StepStatus.SUCCESS,
                output="ok",
                metrics={},
                learnings=[],
                label=label,
            ),
        )

    monkeypatch.setattr(executor, "load_flow", fake_load_flow)
    monkeypatch.setattr(executor.registry, "create", fake_agent_factory)
    dummy_cfg = tmp_path / "mock_agent.yaml"
    dummy_cfg.write_text("id: mock_agent")
    monkeypatch.setattr(executor.settings, "agents_dir", tmp_path)

    session = run_flow("implement_feature_iterative", flow_input)
    # With max_retries=1, a single needs_retry should promote to issue_needed -> issue
    assert calls.count("implement_feature_iterative") == 1
    assert calls[-1] == "create_feature_issue"
    assert session.steps[-1].result.label in {"issue_created", "success"}
