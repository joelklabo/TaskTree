from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

import tasktree.api.routes_constitution as routes_constitution
import tasktree.api.routes_debug as routes_debug
import tasktree.api.routes_debug_session as routes_debug_session
import tasktree.api.routes_editors as routes_editors
import tasktree.api.routes_flows as routes_flows
import tasktree.api.routes_log_digest as routes_log_digest
import tasktree.api.routes_logs as routes_logs
import tasktree.api.routes_prompts as routes_prompts
import tasktree.api.routes_runs as routes_runs
import tasktree.api.routes_trace as routes_trace
import tasktree.api.routes_workbench as routes_workbench

app = FastAPI(title="TaskTree API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # adjust in real deployments
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter()
api_router.include_router(routes_flows.router, prefix="/flows", tags=["flows"])
api_router.include_router(routes_runs.router, prefix="/runs", tags=["runs"])
api_router.include_router(routes_trace.router, prefix="/trace", tags=["trace"])
api_router.include_router(routes_constitution.router, prefix="/constitution", tags=["constitution"])
api_router.include_router(routes_debug.router, prefix="/debug", tags=["debug"])
api_router.include_router(routes_logs.router, prefix="/logs", tags=["logs"])
api_router.include_router(routes_editors.router, prefix="/editor", tags=["editor"])
api_router.include_router(routes_debug_session.router, prefix="/debug", tags=["debug_session"])
api_router.include_router(routes_log_digest.router, prefix="/log-digest", tags=["log-digest"])
api_router.include_router(routes_prompts.router, prefix="/prompts", tags=["prompts"])
api_router.include_router(routes_workbench.router, prefix="/workbench", tags=["workbench"])

@api_router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

app.get("/health")(health)
app.include_router(api_router, prefix="/api")
