from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
AGENTS_DIR = ROOT / "agents"


def test_agent_docs_exist() -> None:
    assert AGENTS_DIR.is_dir(), "agents/ directory missing at repo root"
    files = sorted(AGENTS_DIR.glob("*.md"))
    assert files, "no agent docs found in agents/"


@pytest.mark.parametrize("agent_file", sorted(AGENTS_DIR.glob("*.md")))
def test_agent_docs_are_tasktree_specific(agent_file: Path) -> None:
    content = agent_file.read_text()
    content_lower = content.lower()

    banned_name_tokens = ["context-"]
    for token in banned_name_tokens:
        assert token not in agent_file.name, f"stale filename token '{token}' in {agent_file.name}"

    banned_tokens = [
        "context-cli",
        "context-core",
        "context-debug",
        "context-devops",
        "context-docs",
        "context-git",
        "context-testing",
        "context-web",
        "agents.context.md",
    ]

    for token in banned_tokens:
        assert token not in content_lower, f"stale reference '{token}' in {agent_file.name}"

    assert "tasktree" in content_lower, f"TaskTree mention missing in {agent_file.name}"
    assert "agents.md" in content_lower, f"AGENTS.md reference missing in {agent_file.name}"


def test_git_agent_doc_mentions_commits_and_hooks() -> None:
    git_doc = AGENTS_DIR / "tasktree-git-agent.md"
    assert git_doc.exists(), "git agent doc missing"
    content = git_doc.read_text().lower()
    assert "commit" in content, "git agent doc should guide commits"
    assert "hook" in content, "git agent doc should mention hooks"
    assert "make test" in content, "git agent doc should remind to run the full test suite"
    assert "scripts/git_hooks" in content, "git agent doc should reference git hook install script"
