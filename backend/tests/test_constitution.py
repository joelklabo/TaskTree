import pytest

from tasktree.coord import constitution as const_mod


def test_next_state_transitions(monkeypatch: pytest.MonkeyPatch) -> None:
    const = const_mod.Constitution(
        ownership={},
        ttl_seconds=1,
        renew_interval=1,
        max_retries=1,
        backoff_seconds=(0, 0),
        task_states={
            "TODO": {"start": "IN_PROGRESS"},
            "IN_PROGRESS": {"tests_passed": "VERIFY"},
        },
        protected=[],
    )
    monkeypatch.setattr(const_mod, "_constitution", const)

    assert const_mod.next_state("TODO", "start") == "IN_PROGRESS"
    assert const_mod.next_state("IN_PROGRESS", "tests_passed") == "VERIFY"
    assert const_mod.next_state("VERIFY", "anything") is None
