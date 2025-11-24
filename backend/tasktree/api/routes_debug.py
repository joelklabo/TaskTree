"""Debug routes for triggering errors in logs (development only)."""

import logging
import os
from pathlib import Path
from typing import Any, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from tasktree import log_events

router = APIRouter()

# Configure loggers
log_path_env = os.getenv("TASKTREE_DEBUG_LOG_PATH")
backend_log_file = (
    Path(log_path_env)
    if log_path_env
    else Path(__file__).resolve().parents[3] / "logs" / "backend-dev.log"
)
backend_log_file.parent.mkdir(parents=True, exist_ok=True)
logger = logging.getLogger("tasktree.debug")
logger.setLevel(logging.ERROR)
if not any(
    isinstance(h, logging.FileHandler) and h.baseFilename == str(backend_log_file)
    for h in logger.handlers
):
    handler = logging.FileHandler(backend_log_file)
    handler.setLevel(logging.ERROR)
    formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)

client_log_file = Path(__file__).resolve().parents[3] / "logs" / "frontend-client.log"
client_log_file.parent.mkdir(parents=True, exist_ok=True)
client_logger = logging.getLogger("tasktree.client")
client_logger.setLevel(logging.ERROR)
if not any(
    isinstance(h, logging.FileHandler) and h.baseFilename == str(client_log_file)
    for h in client_logger.handlers
):
    ch = logging.FileHandler(client_log_file)
    ch.setLevel(logging.ERROR)
    ch.setFormatter(logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s"))
    client_logger.addHandler(ch)

ErrorType = Literal[
    "type_error",
    "value_error",
    "key_error",
    "zero_division",
    "attribute_error",
]


class ClientErrorPayload(BaseModel):
    """Payload for client-side error logging."""

    message: str
    name: str | None = None
    stack: str | None = None
    context: dict[str, Any] | None = None
    user_agent: str | None = None


def _trigger_type_error() -> None:
    """Trigger a TypeError by adding incompatible types."""

    def calculate_total(items: list[int]) -> int:
        # Intentional bug: will fail if items contains a string
        return sum(items)

    # This will cause: TypeError: unsupported operand type(s) for +: 'int' and 'str'
    calculate_total([1, 2, "three", 4])  # type: ignore


def _trigger_value_error() -> None:
    """Trigger a ValueError by converting invalid string to int."""

    def parse_config(value: str) -> int:
        # Intentional bug: doesn't validate input
        return int(value)

    # This will cause: ValueError: invalid literal for int() with base 10: 'not_a_number'
    parse_config("not_a_number")


def _trigger_key_error() -> None:
    """Trigger a KeyError by accessing non-existent dict key."""

    def get_user_setting(config: dict[str, str], key: str) -> str:
        # Intentional bug: doesn't check if key exists
        return config[key]

    # This will cause: KeyError: 'missing_key'
    get_user_setting({"name": "test"}, "missing_key")


def _trigger_zero_division() -> None:
    """Trigger a ZeroDivisionError."""

    def calculate_average(total: int, count: int) -> float:
        # Intentional bug: doesn't check for zero
        return total / count

    # This will cause: ZeroDivisionError: division by zero
    calculate_average(100, 0)


def _trigger_attribute_error() -> None:
    """Trigger an AttributeError by accessing non-existent attribute."""

    class Config:
        def __init__(self) -> None:
            self.name = "test"

    def get_config_value(config: Config) -> str:
        # Intentional bug: attribute doesn't exist
        return config.missing_attribute  # type: ignore

    # This will cause: AttributeError: 'Config' object has no attribute 'missing_attribute'
    get_config_value(Config())


@router.get("/trigger-error")
def trigger_error(error_type: ErrorType = "type_error") -> dict[str, str]:
    """
    Trigger an error and log it to backend-dev.log.

    Only works in development mode (when TASKTREE_ENV != production).

    Args:
        error_type: Type of error to trigger

    Returns:
        Success message with error type

    Raises:
        HTTPException: If called in production or if error type unknown
    """
    # Safety check: only allow in development
    if os.getenv("TASKTREE_ENV") == "production":
        raise HTTPException(
            status_code=403,
            detail="Debug endpoints are disabled in production",
        )

    error_triggers = {
        "type_error": _trigger_type_error,
        "value_error": _trigger_value_error,
        "key_error": _trigger_key_error,
        "zero_division": _trigger_zero_division,
        "attribute_error": _trigger_attribute_error,
    }

    trigger_fn = error_triggers.get(error_type)
    if not trigger_fn:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown error type: {error_type}",
        )

    try:
        # Call the function that will raise the error
        trigger_fn()
    except Exception as e:
        # Log the error with full stack trace
        logger.exception(f"Debug error triggered: {error_type}")
        # Return success (we wanted the error to happen)
        return {
            "status": "error_logged",
            "error_type": error_type,
            "error": str(e),
            "log_file": str(backend_log_file),
        }

    # This should never be reached
    return {"status": "no_error", "error_type": error_type}


@router.post("/log-client-error")
def log_client_error(payload: ClientErrorPayload) -> dict[str, str]:
    """
    Accept a client-side error payload and log it to the debug log.

    Intended for frontend error drills so the log watcher can pick it up.
    """
    if os.getenv("TASKTREE_ENV") == "production":
        raise HTTPException(
            status_code=403,
            detail="Client error logging is disabled in production",
        )

    synthetic = bool(payload.context.get("synthetic") if payload.context else False)
    tag = "[SYNTHETIC] " if synthetic else ""
    lines = [
        f"{tag}ClientError: {payload.name or 'Error'} - {payload.message}",
    ]
    if payload.user_agent:
        lines.append(f"User-Agent: {payload.user_agent}")
    if payload.context:
        lines.append(f"Context: {payload.context}")
    if payload.stack:
        lines.append("Stack (client):")
        lines.extend(payload.stack.splitlines())

    logger.error("\n".join(lines))
    client_logger.error("\n".join(lines))
    log_events.publish(
        {
            "type": "log_error",
            "message": payload.message,
            "name": payload.name or "Error",
            "log_file": str(client_log_file),
            "synthetic": synthetic,
        }
    )
    return {"status": "logged", "log_file": str(client_log_file)}
