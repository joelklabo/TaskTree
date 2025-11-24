
import time
from unittest.mock import MagicMock, patch

import pytest

from tasktree.agents.base import AgentOutput
from tasktree.core.debug_session import DebugSession
from tasktree.core.executor import FlowDef, StepDef, run_flow
from tasktree.core.state import StepStatus, TaskResult


# Mock load_flow to avoid file system dependency
@pytest.fixture
def mock_load_flow():
    with patch("tasktree.core.executor.load_flow") as mock:
        flow = FlowDef(
            id="test_flow",
            version="1.0",
            description="Test Flow",
            start="step1",
            steps={
                "step1": StepDef(
                    name="step1",
                    agent="mock_agent",
                    action="act1",
                    resources=[],
                    transitions={"success": "step2"},
                ),
                "step2": StepDef(
                    name="step2",
                    agent="mock_agent",
                    action="act2",
                    resources=[],
                    transitions={"success": "end"},
                ),
            }
        )
        mock.return_value = flow
        yield mock

# Mock agent registry
@pytest.fixture
def mock_registry():
    with patch("tasktree.core.executor.registry") as mock:
        agent = MagicMock()
        agent.run_step.return_value.result.status.value = "success"
        agent.run_step.return_value.result.label = "success"
        agent.run_step.return_value.parsed = {}
        mock.create.return_value = agent
        yield mock

# Mock settings to avoid file not found for agent config
@pytest.fixture
def mock_settings():
    with patch("tasktree.core.executor.settings") as mock:
        # Mock / operator
        mock.agents_dir.__truediv__.return_value.exists.return_value = True
        mock.agents_dir.__truediv__.return_value.read_text.return_value = "id: mock_agent"
        yield mock

def test_debug_session_breakpoints(mock_load_flow, mock_registry, mock_settings):
    session = DebugSession("test_flow", {})
    session.add_breakpoint("step1")
    
    session.start()
    
    # Should pause before step1
    assert session.pause_event.wait(timeout=2)
    assert session.current_step == "step1"
    assert session.current_phase == "before"
    
    # Resume
    session.resume()
    
    # Should finish (no more breakpoints)
    session.thread.join(timeout=2)
    assert not session.is_running
    assert len(session.session_record.steps) == 2

def test_debug_session_stepping(mock_load_flow, mock_registry, mock_settings):
    session = DebugSession("test_flow", {})
    # No breakpoints initially, but we use step()
    
    # We need to pause at start to enable stepping?
    # Currently DebugSession doesn't pause at start unless breakpoint is set.
    # Let's add a breakpoint at step1
    session.add_breakpoint("step1")
    
    session.start()
    
    # Pause before step1
    assert session.pause_event.wait(timeout=2)
    assert session.current_phase == "before"
    assert session.current_step == "step1"
    
    # Step Over
    session.step()
    
    # Wait for phase to change (resume happened)
    while session.current_phase == "before":
        time.sleep(0.01)
    
    # Should pause after step1
    assert session.pause_event.wait(timeout=2)
    assert session.current_phase == "after"
    assert session.current_step == "step1"
    
    # Step Over
    session.step()
    
    # Wait for phase to change
    while session.current_phase == "after":
        time.sleep(0.01)
    
    # Should pause before step2
    assert session.pause_event.wait(timeout=2)
    assert session.current_phase == "before"
    assert session.current_step == "step2"
    
    # Resume to end
    session.resume()
    session.thread.join(timeout=2)
    assert not session.is_running

def test_debug_session_profile_override(mock_load_flow, mock_registry, mock_settings):
    session = DebugSession("test_flow", {}, agent_profile="custom_profile")
    session.start()
    session.thread.join(timeout=2)
    
    # Verify that executor tried to load custom_profile.yaml
    # The mock_settings.agents_dir / ... is called.
    # We need to check the calls to __truediv__ on agents_dir
    
    # mock_settings.agents_dir is a MagicMock.
    # __truediv__ is called with the filename.
    
    # We expect "custom_profile.yaml" to be accessed
    # executor.py: agent_file = f"{env_profile}.yaml" ...
    # agent_cfg_path = settings.agents_dir / agent_file
    
    mock_settings.agents_dir.__truediv__.assert_any_call("custom_profile.yaml")


def test_run_flow_passes_scenario_and_prompt_override(mock_load_flow, mock_settings):
    captured: dict[str, dict] = {}

    def fake_agent_factory(agent_id: str, cfg: dict) -> object:
        class DummyAgent:
            def run_step(self, action: str, ctx):
                captured["metadata"] = ctx.metadata
                return AgentOutput(
                    prompt="p",
                    raw_response="r",
                    parsed={},
                    result=TaskResult(
                        status=StepStatus.SUCCESS,
                        output="ok",
                        metrics={},
                        learnings=[],
                        label="success",
                    ),
                )

        return DummyAgent()

    with patch("tasktree.core.executor.registry.create", side_effect=fake_agent_factory), patch(
        "tasktree.core.executor._debug_log"
    ) as mock_log:
        run_flow(
            "test_flow",
            {},
            scenario_id="scn-xyz",
            prompt_overrides={"act1": "custom prompt"},
            agent_profile=None,
        )

    assert captured["metadata"]["scenario_id"] == "scn-xyz"
    assert captured["metadata"]["prompt_overrides"] == {"act1": "custom prompt"}
    assert any("scn-xyz" in str(call) for call in mock_log.call_args_list)
