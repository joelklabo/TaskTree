#!/usr/bin/env python3
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
README = ROOT / "README.md"

BLOCK_START = "<!--status:start-->"
BLOCK_END = "<!--status:end-->"

CONTENT = """\
| Check | Status |
| --- | --- |
| CI | ![CI](https://img.shields.io/github/actions/workflow/status/honk/TaskTree/ci.yml?branch=main&label=ci) |
| Pages | ![Pages](https://img.shields.io/github/actions/workflow/status/honk/TaskTree/pages.yml?branch=main&label=pages) |
| CodeQL | ![CodeQL](https://img.shields.io/github/actions/workflow/status/honk/TaskTree/codeql.yml?branch=main&label=codeql) |
| Security | ![Security](https://img.shields.io/github/actions/workflow/status/honk/TaskTree/security.yml?branch=main&label=security) |
"""


def update_block(text: str) -> str:
    if BLOCK_START not in text or BLOCK_END not in text:
        raise SystemExit("status block markers not found in README")
    before, rest = text.split(BLOCK_START, 1)
    _, after = rest.split(BLOCK_END, 1)
    block = f"{BLOCK_START}\n{CONTENT}{BLOCK_END}"
    return before + block + after


def main() -> None:
    original = README.read_text()
    updated = update_block(original)
    if updated != original:
        README.write_text(updated)
        print("Updated README managed status block.")
    else:
        print("README status block up to date.")


if __name__ == "__main__":
    sys.exit(main())
