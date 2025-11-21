
from pathlib import Path

import pytest

from tasktree.coord import leases


class FakeTime:
    def __init__(self, start: float):
        self._t = start

    def time(self) -> float:
        return self._t

    def sleep(self, seconds: float) -> None:
        self._t += seconds

    def advance(self, seconds: float) -> None:
        self._t += seconds


@pytest.fixture(autouse=True)
def _reset_leases_dir(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setattr(leases, "LEASES_DIR", tmp_path)
    tmp_path.mkdir(exist_ok=True)


def test_lease_renew(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    fake = FakeTime(1_000.0)
    monkeypatch.setattr(leases, "time", fake)
    monkeypatch.setattr(leases, "random", __import__("random"))

    lease = leases.acquire("resource", "holder")

    fake.advance(lease.ttl - 1)
    assert lease.expired is False

    fake.advance(2)
    assert lease.expired is True

    lease.renew()
    assert lease.expired is False


def test_acquire_exceeds_retries(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    fake = FakeTime(1_000.0)
    monkeypatch.setattr(leases, "time", fake)

    holder1 = leases.acquire("resource", "holder1")
    holder1.ttl = 10
    holder1.renew()

    # reduce retries to force failure
    monkeypatch.setattr(leases.constitution(), "max_retries", 0)

    with pytest.raises(leases.LeaseError):
        leases.acquire("resource", "holder2")


def test_corrupt_lease_file_is_ignored(tmp_path: Path) -> None:
    path = leases.lease_path("bad_resource")
    path.write_text("not-json")

    lease = leases.read_lease(path)
    assert lease is None
    assert not path.exists()
