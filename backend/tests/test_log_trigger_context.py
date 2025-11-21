from pathlib import Path

from tasktree.log_trigger import LogEvent, LogTrigger, TriggerConfig


def test_log_trigger_includes_context(tmp_path: Path) -> None:
    log_file = tmp_path / "dev-app.log"
    log_file.write_text("line1\nline2\nERROR the boom\nline4\nline5\n", encoding="utf-8")

    calls: list[dict] = []

    def runner(payload: dict) -> None:
        calls.append(payload)

    trigger = LogTrigger(
        TriggerConfig(
            paths=[log_file],
            patterns=[r"ERROR"],
            poll_seconds=0.05,
            min_interval_seconds=0.0,
            context_lines=1,
        ),
        flow_runner=runner,
    )
    trigger._on_event(
        LogEvent(path=log_file, line="ERROR the boom", lineno=3, matched_pattern=r"ERROR")
    )

    payload = calls.pop()
    context = payload["context"]
    assert context["before"] == ["line2"]
    assert context["after"] == ["line4"]
