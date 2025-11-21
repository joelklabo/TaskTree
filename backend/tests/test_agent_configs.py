from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
AGENT_CFG_DIR = REPO_ROOT / "backend" / "tasktree" / "config" / "agents"


def test_agent_configs_exist() -> None:
    assert AGENT_CFG_DIR.is_dir(), "agents config directory missing"
    files = sorted(AGENT_CFG_DIR.glob("*.yaml"))
    assert files, "no agent config yamls found"


def test_agent_configs_tasktree_specific() -> None:
    banned_tokens = ["context-"]
    for cfg_path in AGENT_CFG_DIR.glob("*.yaml"):
        data = cfg_path.read_text()
        for token in banned_tokens:
            assert token not in cfg_path.name, f"stale token '{token}' in filename {cfg_path.name}"
            assert token not in data.lower(), f"stale token '{token}' in {cfg_path.name}"

        cfg = yaml.safe_load(data)
        assert "id" in cfg, f"missing id in {cfg_path.name}"
        assert cfg["id"], f"empty id in {cfg_path.name}"
