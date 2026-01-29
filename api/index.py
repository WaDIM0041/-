
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ПРИМЕЧАНИЕ ДЛЯ АРХИТЕКТОРА: 
# На Vercel MEM_DB сбрасывается при каждом холодном старте.
# Для реальной работы необходимо использовать GitHub API (реализовано в фронтенде)
# или подключить внешнюю БД (Redis/PostgreSQL).
MEM_DB = {
    "projects": [],
    "tasks": [],
    "users": [],
    "timestamp": "2024-01-01T00:00:00.000Z"
}

class AppState(BaseModel):
    projects: List[Dict[str, Any]]
    tasks: List[Dict[str, Any]]
    users: Optional[List[Dict[str, Any]]] = None
    timestamp: str

@app.get("/api/sync")
async def get_state():
    return MEM_DB

@app.post("/api/sync")
async def post_sync(state: AppState):
    global MEM_DB
    if state.timestamp > MEM_DB["timestamp"]:
        MEM_DB["projects"] = state.projects
        MEM_DB["tasks"] = state.tasks
        if state.users:
            MEM_DB["users"] = state.users
        MEM_DB["timestamp"] = state.timestamp
        return {"status": "synced", "timestamp": MEM_DB["timestamp"]}
    return MEM_DB
