
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from tasktree.api.app import app

client = TestClient(app)

@pytest.fixture
def mock_settings(tmp_path):
    # Create directory structure
    prompts_dir = tmp_path / "prompts"
    prompts_dir.mkdir()
    
    # Create a dummy prompt
    (prompts_dir / "test_prompt.j2").write_text("Hello {{ name }}")
    
    # Create flows dir and dummy flow
    flows_dir = tmp_path / "flows"
    flows_dir.mkdir()
    (flows_dir / "test_flow.yaml").write_text("id: test_flow\nsteps: []")

    # Create agents dir and dummy agent
    agents_dir = tmp_path / "agents"
    agents_dir.mkdir()
    (agents_dir / "test_agent.yaml").write_text("id: test_agent\nmodel: gpt-4")

    # We need to patch where the router imports settings, or the global settings if used directly
    # Assuming the router will be in tasktree.api.routes_editors
    with patch("tasktree.api.routes_editors.settings") as mock_settings_obj:
        mock_settings_obj.prompts_dir = prompts_dir
        mock_settings_obj.flows_dir = flows_dir
        mock_settings_obj.agents_dir = agents_dir
        yield mock_settings_obj

def test_list_prompts(mock_settings):
    response = client.get("/api/editor/prompts")
    assert response.status_code == 200
    data = response.json()
    assert "test_prompt.j2" in data

def test_get_prompt(mock_settings):
    response = client.get("/api/editor/prompts/test_prompt.j2")
    assert response.status_code == 200
    data = response.json()
    assert data["content"] == "Hello {{ name }}"
    assert data["name"] == "test_prompt.j2"

def test_update_prompt(mock_settings):
    new_content = "Goodbye {{ name }}"
    response = client.put(
        "/api/editor/prompts/test_prompt.j2", 
        json={"content": new_content}
    )
    assert response.status_code == 200
    
    # Verify file system change
    prompt_path = mock_settings.prompts_dir / "test_prompt.j2"
    assert prompt_path.read_text() == new_content

def test_get_prompt_not_found(mock_settings):
    response = client.get("/api/editor/prompts/missing.j2")
    assert response.status_code == 404

# --- Flows Tests ---

def test_list_flows(mock_settings):
    response = client.get("/api/editor/flows")
    assert response.status_code == 200
    data = response.json()
    assert "test_flow.yaml" in data

def test_get_flow(mock_settings):
    response = client.get("/api/editor/flows/test_flow.yaml")
    assert response.status_code == 200
    data = response.json()
    assert "id: test_flow" in data["content"]

def test_update_flow(mock_settings):
    new_content = "id: test_flow\nsteps: [{id: step1}]"
    response = client.put(
        "/api/editor/flows/test_flow.yaml", 
        json={"content": new_content}
    )
    assert response.status_code == 200
    assert (mock_settings.flows_dir / "test_flow.yaml").read_text() == new_content

def test_update_flow_invalid_yaml(mock_settings):
    response = client.put(
        "/api/editor/flows/test_flow.yaml",
        # YAML forbids tabs; start with a clear syntax error.
        json={"content": "id: test_flow\n  tab_indentation: forbidden"},
    )
    # Actually, let's just send garbage
    response = client.put(
        "/api/editor/flows/test_flow.yaml",
        json={"content": ": - invalid yaml"},
    )
    assert response.status_code == 400

# --- Agents Tests ---

def test_list_agents(mock_settings):
    response = client.get("/api/editor/agents")
    assert response.status_code == 200
    data = response.json()
    assert "test_agent.yaml" in data

def test_get_agent(mock_settings):
    response = client.get("/api/editor/agents/test_agent.yaml")
    assert response.status_code == 200
    data = response.json()
    assert "model: gpt-4" in data["content"]

def test_update_agent(mock_settings):
    new_content = "id: test_agent\nmodel: gpt-3.5"
    response = client.put(
        "/api/editor/agents/test_agent.yaml", 
        json={"content": new_content}
    )
    assert response.status_code == 200
    assert (mock_settings.agents_dir / "test_agent.yaml").read_text() == new_content
