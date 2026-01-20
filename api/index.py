from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from enum import Enum
import time

app = FastAPI()

# Разрешаем CORS для фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Глобальное хранилище в памяти (для демонстрации)
# В продакшене здесь должна быть БД (PostgreSQL/Redis)
GLOBAL_STORE = {
    "projects": [],
    "tasks": [],
    "last_updated": 0
}

class TaskStatus(str, Enum):
    TODO = 'todo'
    IN_PROGRESS = 'in_progress'
    REVIEW = 'review'
    DONE = 'done'
    REWORK = 'rework'

class StatusUpdate(BaseModel):
    new_status: TaskStatus
    comment: Optional[str] = None
    evidence_added: bool = False

class SyncPayload(BaseModel):
    projects: List[Dict[str, Any]]
    tasks: List[Dict[str, Any]]
    timestamp: float

@app.get("/api/health")
async def health():
    return {"status": "ok", "app": "Zodchiy Real-time API"}

@app.get("/api/sync")
async def get_sync_state():
    """Получить текущее состояние базы данных"""
    return GLOBAL_STORE

@app.post("/api/sync")
async def update_sync_state(payload: SyncPayload):
    """Обновить состояние базы данных (Merge logic)"""
    global GLOBAL_STORE
    
    # Простейшая логика: кто последний, тот и прав (LWW - Last Write Wins)
    # В реальном приложении здесь нужен мерж по ID и конфликтам
    if payload.timestamp > GLOBAL_STORE["last_updated"]:
        GLOBAL_STORE["projects"] = payload.projects
        GLOBAL_STORE["tasks"] = payload.tasks
        GLOBAL_STORE["last_updated"] = payload.timestamp
        return {"status": "updated", "timestamp": GLOBAL_STORE["last_updated"]}
    
    return {"status": "stale", "current_timestamp": GLOBAL_STORE["last_updated"]}

@app.patch("/api/tasks/{task_id}/status")
async def update_status(task_id: int, update: StatusUpdate):
    return {
        "id": task_id,
        "status": update.new_status,
        "updated_at": "2024-05-20T12:00:00Z"
    }
