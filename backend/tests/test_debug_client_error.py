import logging
from pathlib import Path

from _pytest.logging import LogCaptureFixture
from fastapi.testclient import TestClient

from tasktree.api.app import app


def test_log_client_error_logs_payload(caplog: LogCaptureFixture) -> None:
    client = TestClient(app)

    with caplog.at_level(logging.ERROR, logger="tasktree.debug"):
        response = client.post(
            "/api/debug/log-client-error",
            json={
                "message": "Frontend exploded",
                "name": "ClientBoom",
                "stack": "Error: Frontend exploded\n    at handler (app.js:10:1)",
                "context": {"path": "/flows", "synthetic": True},
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "logged"
    assert body["log_file"].endswith("frontend-client.log")

    # Ensure the error line and stack were emitted (with synthetic tag)
    assert "ClientBoom" in caplog.text
    assert "[SYNTHETIC]" in caplog.text
    assert "Frontend exploded" in caplog.text
    assert "app.js:10:1" in caplog.text

    # Ensure the frontend-client log file was written
    log_path = Path(body["log_file"])
    assert log_path.exists()
    assert "Frontend exploded" in log_path.read_text()
