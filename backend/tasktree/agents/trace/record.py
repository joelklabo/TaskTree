import os
import sys

from .trace import TraceRun


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python -m tasktree.agents.trace.record <command...>")
        sys.exit(1)

    cmd = sys.argv[1:]
    cwd = os.getcwd()

    run_id = os.environ.get("TASKTREE_RUN_ID")
    tr = TraceRun(run_id=run_id)

    tr.write_meta_start(cmd, cwd)

    env_text = "\n".join(f"{k}={v}" for k, v in sorted(os.environ.items()))
    tr.env_lock.write_text(env_text)

    os.environ["TASKTREE_RUN_ID"] = tr.run_id
    os.environ["TASKTREE_TRACE_ROOT"] = str(tr.root)

    exit_code = tr.run(cmd)
    tr.write_meta_end(exit_code)

    print(tr.run_id)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
