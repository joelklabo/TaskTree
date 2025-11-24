
import asyncio
from dataclasses import asdict
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from tasktree.core.debug_session import DebugSession

router = APIRouter()

# Global registry of active debug sessions
# In a real app, this should be in a singleton service or database-backed
active_sessions: dict[str, DebugSession] = {}

class StartDebugRequest(BaseModel):
    flow_id: str
    input: dict[str, Any]
    breakpoints: list[str] = []
    agent_profile: str | None = None
    scenario_id: str | None = None
    prompt_overrides: dict[str, str] | None = None
    llm_model: str | None = None

@router.post("/sessions")
def start_debug_session(req: StartDebugRequest) -> dict[str, str]:
    session_id = uuid4().hex
    # We wrap the input to include session_id if needed, but DebugSession handles it via run_flow
    input_data = dict(req.input)
    if req.llm_model:
        input_data["llm_model"] = req.llm_model
    if req.scenario_id:
        input_data.setdefault("_scenario_id", req.scenario_id)

    ds = DebugSession(
        req.flow_id,
        input_data,
        req.agent_profile,
        scenario_id=req.scenario_id,
        prompt_overrides=req.prompt_overrides,
    )
    for bp in req.breakpoints:
        ds.add_breakpoint(bp)
    
    # Start the thread
    ds.start()
    
    active_sessions[session_id] = ds
    return {"session_id": session_id}

@router.websocket("/sessions/{session_id}/ws")
async def debug_websocket(websocket: WebSocket, session_id: str) -> None:
    if session_id not in active_sessions:
        await websocket.close(code=4004, reason="Session not found")
        return

    ds = active_sessions[session_id]
    await websocket.accept()

    # Background task to push updates
    async def push_updates() -> None:
        last_phase = None
        last_step = None
        while True:
            if not ds.is_running and not ds.pause_event.is_set():
                # Session finished
                result = asdict(ds.session_record) if ds.session_record else None
                await websocket.send_json(
                    {"type": "finished", "result": result, "scenario_id": ds.scenario_id}
                )
                break
            
            if ds.pause_event.is_set():
                # We are paused
                if ds.current_phase != last_phase or ds.current_step != last_step:
                    last_phase = ds.current_phase
                    last_step = ds.current_step
                    
                    # Get context from somewhere?
                    # DebugSession doesn't expose context easily yet.
                    # run_flow has flow_input, but it's local variable.
                    # We need to expose it.
                    
                    await websocket.send_json(
                        {
                            "type": "paused",
                            "phase": ds.current_phase,
                            "step": ds.current_step,
                            "context": ds.current_context,
                            "scenario_id": ds.scenario_id,
                        }
                    )
            
            await asyncio.sleep(0.1)

    push_task = asyncio.create_task(push_updates())

    try:
        while True:
            data = await websocket.receive_json()
            cmd = data.get("command")
            
            if cmd == "resume":
                ds.resume()
            elif cmd == "step":
                ds.step()
            elif cmd == "add_breakpoint":
                ds.add_breakpoint(data.get("step"))
            elif cmd == "remove_breakpoint":
                ds.remove_breakpoint(data.get("step"))
            elif cmd == "stop":
                # TODO: Implement stop
                break
    except WebSocketDisconnect:
        pass
    finally:
        push_task.cancel()
        # Don't kill the session immediately? Or do we?
        # For now, let it run or keep it in registry.
