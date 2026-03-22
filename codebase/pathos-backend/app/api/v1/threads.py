from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.models.thread import MessageOut, ThreadDetail, ThreadOut
from app.services.thread_service import ThreadNotFoundError, ThreadService

router = APIRouter()


class ThreadCreateRequest(BaseModel):
    title: str = Field(min_length=1)
    store_thread: bool = False


class ThreadCreateResponse(BaseModel):
    stored: bool
    thread: ThreadOut


class ThreadMessageRequest(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1)
    trace_id: str | None = None
    store_thread: bool = False


class ThreadMessageResponse(BaseModel):
    stored: bool
    message: MessageOut


@router.post("/threads", response_model=ThreadCreateResponse)
def create_thread(request: ThreadCreateRequest) -> ThreadCreateResponse:
    thread, stored = ThreadService.create_thread(title=request.title, store_thread=request.store_thread)
    return ThreadCreateResponse(stored=stored, thread=thread)


@router.post("/threads/{thread_id}/messages", response_model=ThreadMessageResponse)
def append_thread_message(thread_id: str, request: ThreadMessageRequest) -> ThreadMessageResponse:
    try:
        message, stored = ThreadService.append_message(
            thread_id=thread_id,
            role=request.role,
            content=request.content,
            trace_id=request.trace_id,
            store_thread=request.store_thread,
        )
    except ThreadNotFoundError as exc:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND"}) from exc
    return ThreadMessageResponse(stored=stored, message=message)


@router.get("/threads/recent", response_model=list[ThreadOut])
def list_recent_threads(limit: int = Query(default=20, ge=1, le=200)) -> list[ThreadOut]:
    return ThreadService.list_threads(limit=limit)


@router.get("/threads/{thread_id}", response_model=ThreadDetail)
def get_thread(thread_id: str, limit: int = Query(default=50, ge=1, le=200)) -> ThreadDetail:
    try:
        return ThreadService.get_thread_detail(thread_id=thread_id, limit=limit)
    except ThreadNotFoundError as exc:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND"}) from exc


@router.delete("/threads/{thread_id}")
def delete_thread(thread_id: str) -> dict:
    try:
        ThreadService.delete_thread(thread_id=thread_id)
        return {"deleted": True, "thread_id": thread_id}
    except ThreadNotFoundError as exc:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND"}) from exc
