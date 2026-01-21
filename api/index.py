
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import time

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Хранилище в памяти
GLOBAL_DB = {
    "projects": [],
    "tasks": [],
    "app_version": "1.2.1",
    "last_updated": 0
}

class SyncPayload(BaseModel):
    projects: List[Dict[str, Any]]
    tasks: List[Dict[str, Any]]
    app_version: str
    timestamp: float

@app.get("/api/sync")
async def get_state():
    """Возвращает текущее состояние системы"""
    return {
        "projects": GLOBAL_DB["projects"],
        "tasks": GLOBAL_DB["tasks"],
        "appVersion": GLOBAL_DB["app_version"],
        "lastUpdated": GLOBAL_DB["last_updated"]
    }

@app.post("/api/sync")
async def update_state(payload: SyncPayload):
    """Принимает изменения и обновляет глобальное состояние"""
    global GLOBAL_DB
    
    if payload.app_version > GLOBAL_DB["app_version"]:
        GLOBAL_DB["app_version"] = payload.app_version

    if payload.timestamp > GLOBAL_DB["last_updated"]:
        GLOBAL_DB["projects"] = payload.projects
        GLOBAL_DB["tasks"] = payload.tasks
        GLOBAL_DB["last_updated"] = payload.timestamp
        return {"status": "success", "synced_at": GLOBAL_DB["last_updated"]}
    
    return {"status": "skipped", "reason": "server data is newer"}

@app.get("/api/health")
async def health():
    return {"status": "active", "version": GLOBAL_DB["app_version"]}
