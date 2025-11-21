import threading
import time
from pathlib import Path

from tasktree.log_watcher import LogEvent, LogWatcher


def test_log_watcher_emits_on_error_line(tmp_path: Path) -> None:
    log_file = tmp_path / "app.log"
    log_file.write_text("info booting\n", encoding="utf-8")

    events: list[LogEvent] = []
    got_event = threading.Event()

    watcher = LogWatcher(
        paths=[str(log_file)],
        patterns=[r"ERROR", r"Exception"],
        poll_seconds=0.05,
    )

    def on_event(ev: LogEvent) -> None:
        events.append(ev)
        got_event.set()

    watcher.start(on_event=on_event)
    try:
        with log_file.open("a", encoding="utf-8") as fh:
            fh.write("info ready\n")
            fh.write("ERROR something broke\n")

        # Allow the watcher to poll at least once after the write.
        time.sleep(0.1)
        assert got_event.wait(timeout=2), "expected watcher to emit an event for error line"
        assert events[0].path == log_file
        assert "ERROR something broke" in events[0].line
        assert events[0].matched_pattern == r"ERROR"
    finally:
        watcher.stop()
