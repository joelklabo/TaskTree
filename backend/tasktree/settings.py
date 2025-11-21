import os
from pathlib import Path

from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = BASE_DIR  # convenience alias for backend root
CONFIG_DIR = Path(__file__).resolve().parent / "config"


class Settings(BaseModel):
    base_dir: Path = BASE_DIR
    database_url: str = os.getenv("TASKTREE_DATABASE_URL", "sqlite:///tasktree.db")
    config_dir: Path = CONFIG_DIR
    flows_dir: Path = CONFIG_DIR / "flows"
    agents_dir: Path = CONFIG_DIR / "agents"
    prompts_dir: Path = CONFIG_DIR / "prompts"
    constitution_path: Path = CONFIG_DIR / "constitution.yaml"


settings = Settings()
