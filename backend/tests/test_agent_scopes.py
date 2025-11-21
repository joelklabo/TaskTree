from __future__ import annotations

import re
from pathlib import Path

import pytest

AGENT_DOCS_ROOT = Path(__file__).resolve().parents[2] / "agents"


def _parse_agent_doc(path: Path) -> dict[str, list[str]]:
    text = path.read_text().splitlines()
    owns: list[str] = []
    excludes: list[str] = []
    current: str | None = None

    header_re = re.compile(r"-\s*\*\*?(Owns|Excludes):?\*\*?:?", re.IGNORECASE)
    bullet_re = re.compile(r"\s*-\s+(.+)")

    for line in text:
        header_match = header_re.match(line.strip())
        if header_match:
            current = header_match.group(1).lower()
            continue
        bullet_match = bullet_re.match(line)
        if bullet_match and current:
            item = bullet_match.group(1).strip()
            if current == "owns":
                owns.append(item)
            elif current == "excludes":
                excludes.append(item)
        elif line.startswith("- ") and not header_match:
            current = None

    if not owns or not excludes:
        raise AssertionError(f"{path.name} is missing Owns/Excludes bullet lists")

    return {"owns": owns, "excludes": excludes}


def test_agent_docs_have_disjoint_ownership() -> None:
    agent_docs = sorted(AGENT_DOCS_ROOT.glob("tasktree-*-agent.md"))
    assert agent_docs, "no agent docs found"

    all_owns: dict[str, list[str]] = {}
    for doc in agent_docs:
        parsed = _parse_agent_doc(doc)
        all_owns[doc.name] = [p.rstrip("/") for p in parsed["owns"]]

    # Ensure no path prefix is claimed by multiple agents.
    seen: dict[str, str] = {}
    collisions: list[str] = []
    for agent, paths in all_owns.items():
        for p in paths:
            if p in seen:
                collisions.append(f"{p} claimed by {agent} and {seen[p]}")
            else:
                seen[p] = agent

    if collisions:
        raise AssertionError("Ownership collisions:\n" + "\n".join(collisions))


@pytest.mark.parametrize("doc", sorted(AGENT_DOCS_ROOT.glob("tasktree-*-agent.md")))
def test_agent_docs_have_owns_and_excludes(doc: Path) -> None:
    parsed = _parse_agent_doc(doc)
    assert parsed["owns"], f"{doc.name} missing owns"
    assert parsed["excludes"], f"{doc.name} missing excludes"
