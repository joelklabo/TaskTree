from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import yaml

from tasktree.agents.codex_cli import PromptMap
from tasktree.settings import settings


def load_agent_config(agent_id: str) -> dict[str, Any]:
    path = settings.agents_dir / f"{agent_id}.yaml"
    if not path.exists():
        return {}
    try:
        return yaml.safe_load(path.read_text()) or {}
    except yaml.YAMLError:
        return {}


def template_for_action(agent_id: str, action: str) -> tuple[Path, str]:
    cfg = load_agent_config(agent_id)
    prompt_dir = Path(cfg.get("prompt_dir", settings.prompts_dir))
    prompt_map = cfg.get("prompt_map", PromptMap)
    template_name = prompt_map.get(action) or PromptMap.get(action)
    if not template_name:
        raise FileNotFoundError(f"No prompt template mapped for action '{action}'")
    template_path = prompt_dir / template_name
    if not template_path.exists():
        raise FileNotFoundError(f"Prompt template '{template_name}' not found in {prompt_dir}")
    return template_path, template_name


def template_for_name(template_name: str) -> Path:
    prompt_dir = settings.prompts_dir
    template_path = prompt_dir / template_name
    if not template_path.exists():
        raise FileNotFoundError(f"Prompt template '{template_name}' not found in {prompt_dir}")
    return template_path


def extract_input_fields(template_source: str) -> list[str]:
    """Heuristic extraction of input.* keys from a Jinja template."""
    fields = set()
    # input.foo
    for match in re.findall(r"\binput\.([a-zA-Z_][\w]*)", template_source):
        fields.add(match)
    # input['foo'] or input["foo"]
    for match in re.findall(r"input\[['\"]([a-zA-Z_][\w]*)['\"]\]", template_source):
        fields.add(match)
    return sorted(fields)


def build_skeleton(template_path: Path) -> dict[str, Any]:
    source = template_path.read_text(encoding="utf-8")
    input_fields = extract_input_fields(source)
    skeleton_input = dict.fromkeys(input_fields, "")
    skeleton: dict[str, Any] = {"input": skeleton_input}
    return skeleton
