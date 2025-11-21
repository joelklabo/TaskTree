import datetime
import json
import os
import subprocess  # nosec B404
from pathlib import Path
from typing import Any, cast


def utc_now() -> str:
    return datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


class TraceRun:
    """
    Represents one traced run.
    """

    def __init__(self, run_id: str | None = None, root: str | Path | None = None):
        self.run_id = run_id or f"{utc_now()}_{os.getpid()}"
        if root:
            self.root = Path(root).resolve()
        else:
            self.root = (Path(__file__).parent / "runs" / self.run_id).resolve()
        self.artifacts = self.root / "artifacts"
        self.meta_path = self.root / "meta.json"
        self.env_lock = self.root / "env.lock"
        self.trace_file = self.root / "trace.jsonl"
        self.log_file = self.root / "agent.log"

        self.root.mkdir(parents=True, exist_ok=True)
        self.artifacts.mkdir(exist_ok=True)

    def _load_meta(self) -> dict[str, Any]:
        if not self.meta_path.exists():
            return {}
        return cast(dict[str, Any], json.loads(self.meta_path.read_text()))

    def write_meta_start(self, cmd: list[str], cwd: str) -> None:
        meta = {
            "run_id": self.run_id,
            "cmd": cmd,
            "cwd": cwd,
            "start_time": utc_now(),
        }
        self.meta_path.write_text(json.dumps(meta, indent=2))

    def update_meta(self, updates: dict[str, Any]) -> None:
        meta = self._load_meta()
        meta.update(updates)
        self.meta_path.write_text(json.dumps(meta, indent=2))

    def write_meta_end(self, exit_code: int, extra: dict[str, Any] | None = None) -> None:
        meta = self._load_meta()
        meta["exit_code"] = exit_code
        meta["end_time"] = utc_now()
        if extra:
            meta.update(extra)
        self.meta_path.write_text(json.dumps(meta, indent=2))

    def append_log(self, text: str) -> None:
        with self.log_file.open("a") as f:
            f.write(text)

    def append_trace_record(self, record: dict[str, Any]) -> None:
        with self.trace_file.open("a") as f:
            f.write(json.dumps(record) + "\n")

    def run(self, cmd: list[str]) -> int:
        proc = subprocess.Popen(  # nosec B603
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )
        if proc.stdout is None:
            raise RuntimeError("Subprocess started without stdout pipe")
        for line in proc.stdout:
            self.append_log(line)
            print(line, end="")
        proc.wait()
        return proc.returncode
