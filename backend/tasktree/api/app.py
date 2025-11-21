from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from tasktree.api import routes_flows, routes_runs, routes_trace

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

app.include_router(api_router, prefix="/api")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
