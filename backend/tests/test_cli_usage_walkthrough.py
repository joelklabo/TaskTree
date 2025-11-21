import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
USAGE_DOC = ROOT / "docs" / "tasktree-cli-usage.md"
START_TAG = "<!-- tasktree-cli-usage:start -->"
END_TAG = "<!-- tasktree-cli-usage:end -->"
SUPPORTED_LANGS = {"sh", "bash", "shell"}


def _extract_usage_section(text: str) -> str:
    start = text.find(START_TAG)
    assert start != -1, f"Start tag {START_TAG} missing in {USAGE_DOC}"

    end = text.find(END_TAG, start)
    assert end != -1, f"End tag {END_TAG} missing in {USAGE_DOC}"
    assert end > start, f"End tag {END_TAG} must come after start tag {START_TAG}"

    return text[start + len(START_TAG) : end]


def _parse_shell_commands(section: str) -> list[str]:
    commands: list[str] = []
    in_shell_block = False

    for line in section.splitlines():
        stripped = line.strip()

        if stripped.startswith("```"):
            if in_shell_block:
                in_shell_block = False
                continue

            lang = stripped.removeprefix("```").strip().lower()
            in_shell_block = lang in SUPPORTED_LANGS
            continue

        if not in_shell_block:
            continue

        if not stripped or stripped.startswith("#"):
            continue

        commands.append(stripped)

    return commands


def test_cli_usage_walkthrough_commands_succeed() -> None:
    assert USAGE_DOC.exists(), f"Usage walkthrough doc missing at {USAGE_DOC}"

    content = USAGE_DOC.read_text()
    usage_section = _extract_usage_section(content)
    commands = _parse_shell_commands(usage_section)

    assert commands, (
        f"Add at least one sh/bash fenced command inside the tagged usage block in {USAGE_DOC}"
    )

    for command in commands:
        result = subprocess.run(
            command,
            cwd=ROOT,
            shell=True,
            capture_output=True,
            text=True,
        )
        assert result.returncode == 0, (
            f"Command failed: {command}\nstdout:\n{result.stdout}\nstderr:\n{result.stderr}"
        )
