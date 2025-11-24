from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any, Protocol

from tasktree.core.state import TaskResult


@dataclass
class AgentContext:
    session_id: str
    flow_name: str
    flow_version: str
    step_name: str
    input: dict[str, Any]
    strategies: list[str]
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class AgentOutput:
    prompt: str
    raw_response: str
    parsed: dict[str, Any]
    result: TaskResult


class Agent(Protocol):
    id: str

    def run_step(self, action: str, ctx: AgentContext) -> AgentOutput: ...


AgentFactory = Callable[[dict[str, Any]], Agent]


class AgentRegistry:
    def __init__(self) -> None:
        self._factories: dict[str, AgentFactory] = {}

    def register(self, agent_id: str, factory: AgentFactory) -> None:
        self._factories[agent_id] = factory

    def create(self, agent_id: str, config: dict[str, Any]) -> Agent:
        if agent_id not in self._factories:
            raise KeyError(f"No agent registered with id '{agent_id}'")
        return self._factories[agent_id](config)


registry = AgentRegistry()
