from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.models.thread import ThreadSummaryOut
from app.services.thread_service import ThreadNotFoundError, ThreadService

router = APIRouter()


class RecomputeThreadSummaryRequest(BaseModel):
    store_thread: bool = False
    mode: Literal["deterministic", "llm", "auto"] = "auto"


@router.post("/threads/{thread_id}/summary/recompute", response_model=ThreadSummaryOut)
def recompute_thread_summary(thread_id: str, request: RecomputeThreadSummaryRequest) -> ThreadSummaryOut:
    try:
        return ThreadService.recompute_thread_summary(
            thread_id=thread_id,
            store_thread=request.store_thread,
            mode=request.mode,
        )
    except ThreadNotFoundError as exc:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND"}) from exc


@router.get("/threads/{thread_id}/summary", response_model=ThreadSummaryOut)
def get_thread_summary(thread_id: str) -> ThreadSummaryOut:
    try:
        return ThreadService.get_thread_summary(thread_id=thread_id)
    except ThreadNotFoundError as exc:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND"}) from exc
