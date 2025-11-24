import time
from pathlib import Path

from tasktree.log_trigger import LogTrigger, TriggerConfig


def test_log_trigger_invokes_runner_on_error(tmp_path: Path) -> None:
    log_file = tmp_path / "dev-app.log"
    log_file.write_text("boot\n", encoding="utf-8")

    calls: list[dict] = []

    def runner(payload: dict) -> None:
        calls.append(payload)

    trigger = LogTrigger(
        TriggerConfig(
            paths=[log_file],
            patterns=[r"ERROR"],
            poll_seconds=0.05,
            min_interval_seconds=0.0,
            flow_id="log_error_handler",
            dry_run=False,
        ),
        flow_runner=runner,
    )
    trigger.start()
    try:
        with log_file.open("a", encoding="utf-8") as fh:
            fh.write("ok\n")
            fh.write("ERROR boom\n")
        time.sleep(0.2)
    finally:
        trigger.stop()

    assert calls, "runner should be called on error match"
    payload = calls[0]
    assert payload["file"] == str(log_file)
    assert payload["error_log"].endswith("ERROR boom")
    assert payload["pattern"] == r"ERROR"
    assert payload["retry_count"] == 0
    assert payload["max_retries"] == 2
    assert payload["previous_attempts"] == []


def test_log_trigger_rate_limits_per_file(tmp_path: Path) -> None:
    log_file = tmp_path / "dev-app.log"
    log_file.write_text("boot\n", encoding="utf-8")

    calls: list[dict] = []

    def runner(payload: dict) -> None:
        calls.append(payload)

    trigger = LogTrigger(
        TriggerConfig(
            paths=[log_file],
            patterns=[r"ERROR"],
            poll_seconds=0.05,
            min_interval_seconds=1.0,
            flow_id="log_error_handler",
            dry_run=False,
        ),
        flow_runner=runner,
    )
    trigger.start()
    try:
        with log_file.open("a", encoding="utf-8") as fh:
            fh.write("ERROR first\n")
            fh.write("ERROR second\n")
        time.sleep(0.3)
    finally:
        trigger.stop()

    assert len(calls) == 1, "rate limiter should suppress rapid duplicate triggers"
