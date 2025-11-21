from fastapi.testclient import TestClient

from tasktree.api.app import app


def test_health_endpoint() -> None:
    client = TestClient(app)
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}
