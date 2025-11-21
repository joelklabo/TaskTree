from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GITIGNORE = ROOT / ".gitignore"


def test_tmp_directory_is_ignored() -> None:
    content = GITIGNORE.read_text().splitlines()
    assert any(line.strip() == "tmp/" for line in content), "tmp/ should be ignored in .gitignore"


def test_temp_directory_is_ignored() -> None:
    content = GITIGNORE.read_text().splitlines()
    assert any(line.strip() == "temp/" for line in content), "temp/ should be ignored in .gitignore"
