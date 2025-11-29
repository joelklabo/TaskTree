import json
import subprocess
from pathlib import Path

from tasktree.core.executor import run_flow
from tasktree.settings import settings as project_settings


def _git(repo: Path, *args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    """Run a git command in repo and return the completed process."""
    cmd = ["git", "-C", str(repo), *args]
    return subprocess.run(cmd, check=check, capture_output=True, text=True)


def test_flow_pushes_branch_after_real_error(monkeypatch, tmp_path):
    """E2E: run a real flow, hit a real failing command, then push a branch to origin."""
    bare_origin = tmp_path / "origin.git"
    subprocess.run(
        ["git", "init", "--bare", str(bare_origin)],
        check=True,
        capture_output=True,
        text=True,
    )

    worktree = tmp_path / "worktree"
    subprocess.run(["git", "init", str(worktree)], check=True, capture_output=True, text=True)
    _git(worktree, "checkout", "-b", "main")
    _git(worktree, "config", "user.name", "TaskTree E2E")
    _git(worktree, "config", "user.email", "tasktree-e2e@example.com")
    _git(worktree, "remote", "add", "origin", str(bare_origin))
    (worktree / "README.md").write_text("seed\n")
    _git(worktree, "add", "README.md")
    _git(worktree, "commit", "-m", "seed commit")
    _git(worktree, "push", "--set-upstream", "origin", "main")

    flows_dir = tmp_path / "flows"
    agents_dir = tmp_path / "agents"
    prompts_dir = tmp_path / "prompts"
    flows_dir.mkdir()
    agents_dir.mkdir()
    prompts_dir.mkdir()
    monkeypatch.setattr(project_settings, "flows_dir", flows_dir)
    monkeypatch.setattr(project_settings, "agents_dir", agents_dir)
    monkeypatch.setattr(project_settings, "prompts_dir", prompts_dir)
    (prompts_dir / "noop.j2").write_text("Action: {{ action }}")

    flow_yaml = flows_dir / "git_error_push.yaml"
    flow_yaml.write_text(
        """
id: git_error_push
version: "0.0.1"
description: "Capture a real error then push a branch with artifacts."
start: reproduce
steps:
  - id: reproduce
    agent: codex_cli
    action: reproduce_error
    resources: []
    transitions:
      failure: push_branch
  - id: push_branch
    agent: codex_cli
    action: push_fix_branch
    resources:
      - "."
    transitions:
      pushed: end
      success: end
      failure: end
            """.strip()
    )

    repro_response = json.dumps(
        {
            "status": "failure",
            "summary": "Reproduced failing run",
            "commands": [
                "python -c \"from pathlib import Path; Path('repro_status.txt').write_text('1'); "
                "import sys; print('boom'); sys.exit(1)\""
            ],
            "label": "failure",
        }
    )
    push_response = json.dumps(
        {
            "status": "success",
            "summary": "Branched and pushed",
            "commands": [
                "git checkout -B tt-e2e-error-branch",
                "echo 'captured failing flow' > repro.txt",
                "git add repro_status.txt repro.txt",
                "git commit -m 'Capture failing flow artifacts'",
                "git push origin tt-e2e-error-branch",
            ],
            "label": "pushed",
        }
    )

    agent_yaml = agents_dir / "codex_cli.yaml"
    agent_yaml.write_text(
        f"""
id: codex_cli
name: "E2E git error agent"
description: "Runs commands to capture an error and push a branch."
llm_enabled: false
execute_commands: true
command_timeout_sec: 30
command_dry_run: false
block_destructive: true
root: "{worktree}"
prompt_dir: "{prompts_dir}"
prompt_map:
  reproduce_error: "noop.j2"
  push_fix_branch: "noop.j2"
mock_responses:
  reproduce_error: |
    {repro_response}
  push_fix_branch: |
    {push_response}
        """.strip()
    )

    session = run_flow("git_error_push", {"repo_root": str(worktree)})

    first_output = session.steps[0].result.output
    status_contents = (worktree / "repro_status.txt").read_text().strip()
    assert status_contents == "1"
    assert "exit=1" in first_output
    assert session.steps[0].result.label == "failure"
    assert session.steps[1].result.label == "pushed"

    _git(bare_origin, "show-ref", "--verify", "refs/heads/tt-e2e-error-branch")
    pushed_commit = _git(
        bare_origin, "log", "--oneline", "-1", "tt-e2e-error-branch", check=True
    ).stdout
    assert "Capture failing flow artifacts" in pushed_commit
