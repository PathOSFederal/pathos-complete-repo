from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ThreadCreate(BaseModel):
    title: str = Field(min_length=1)
    consent_store: bool = False


class ThreadOut(BaseModel):
    thread_id: str
    created_at: datetime
    updated_at: datetime
    title: str
    consent_store: bool


class MessageCreate(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1)
    trace_id: str | None = None


class MessageOut(BaseModel):
    message_id: str
    thread_id: str
    created_at: datetime
    role: Literal["user", "assistant"]
    content: str
    trace_id: str | None = None


class ThreadDetail(BaseModel):
    thread: ThreadOut
    messages: list[MessageOut] = Field(default_factory=list)


class ThreadSummaryOut(BaseModel):
    thread_id: str
    stored: bool
    summary: str | None = None
    summary_updated_at: datetime | None = None
    summary_version: str = "v1"
    mode_used: Literal["deterministic", "llm"] | None = None
