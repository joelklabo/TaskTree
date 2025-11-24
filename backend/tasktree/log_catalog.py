"""Metadata helpers for known TaskTree log sources."""


from __future__ import annotations

# Known descriptions for common log files under logs/.
_DESCRIPTIONS: dict[str, str] = {
    "backend-dev.log": (
        "FastAPI backend debug/error log (includes /api/debug/log-client-error entries)."
    ),
    "frontend-client.log": "Client-side errors captured via /api/debug/log-client-error.",
    "frontend-dev.log": "Frontend dev server (Vite) output.",
    "e2e-backend.log": "Backend server logs captured during Playwright e2e runs.",
    "e2e-frontend.log": "Frontend logs captured during Playwright e2e runs.",
    "debug.log": "Flow executor debug trace (step transitions, lease details).",
    "llm_transcript.log": "LLM prompt/response transcripts captured during agent runs.",
    "lint.log": "Aggregated lint output (backend/frontend/tools).",
    "npm.log": "Aggregated frontend pnpm/npm task output.",
}


def describe_log(name: str) -> str:
    """Return a human-friendly description for a log file name."""
    return _DESCRIPTIONS.get(name, f"Log file {name}")
