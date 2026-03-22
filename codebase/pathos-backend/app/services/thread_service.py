from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

from app.engine.thread_summary_v1 import SUMMARY_VERSION, summarize
from app.db.repo.thread_repo import ThreadRepo
from app.llm.thread_summarizer import refine_summary_with_llm
from app.models.thread import MessageOut, ThreadDetail, ThreadOut, ThreadSummaryOut
from app.services.audit_service import AuditService

TRUNCATE_SUFFIX = "…[truncated]"
MAX_MESSAGE_LENGTH = 4000


class ThreadNotFoundError(Exception):
    pass


class ThreadService:
    @staticmethod
    def create_thread(title: str, store_thread: bool) -> tuple[ThreadOut, bool]:
        if not store_thread:
            now = datetime.now(timezone.utc)
            ephemeral_thread = ThreadOut(
                thread_id=str(uuid4()),
                created_at=now,
                updated_at=now,
                title=title,
                consent_store=False,
            )
            return ephemeral_thread, False
        return ThreadRepo.create_thread(title=title, consent_store=True), True

    @staticmethod
    def _truncate_content(content: str) -> str:
        if len(content) <= MAX_MESSAGE_LENGTH:
            return content
        keep = MAX_MESSAGE_LENGTH - len(TRUNCATE_SUFFIX)
        if keep <= 0:
            return TRUNCATE_SUFFIX[:MAX_MESSAGE_LENGTH]
        return f"{content[:keep]}{TRUNCATE_SUFFIX}"

    @staticmethod
    def append_message(
        thread_id: str, role: Literal["user", "assistant"], content: str, trace_id: str | None, store_thread: bool
    ) -> tuple[MessageOut, bool]:
        sanitized_content = ThreadService._truncate_content(content)
        if not store_thread:
            return (
                MessageOut(
                    message_id=str(uuid4()),
                    thread_id=thread_id,
                    created_at=datetime.now(timezone.utc),
                    role=role,
                    content=sanitized_content,
                    trace_id=None,
                ),
                False,
            )

        thread = ThreadRepo.get_thread(thread_id)
        if thread is None:
            raise ThreadNotFoundError(f"Thread not found for thread_id={thread_id}")
        if not thread.consent_store:
            return (
                MessageOut(
                    message_id=str(uuid4()),
                    thread_id=thread_id,
                    created_at=datetime.now(timezone.utc),
                    role=role,
                    content=sanitized_content,
                    trace_id=None,
                ),
                False,
            )

        persisted_trace_id = trace_id if (trace_id and AuditService.trace_exists(trace_id)) else None
        message = ThreadRepo.add_message(
            thread_id=thread_id,
            role=role,
            content=sanitized_content,
            trace_id=persisted_trace_id,
        )
        ThreadRepo.update_thread_timestamp(thread_id=thread_id)
        ThreadService.recompute_thread_summary(thread_id=thread_id, store_thread=True, mode="deterministic")
        return message, True

    @staticmethod
    def get_thread_detail(thread_id: str, limit: int = 50) -> ThreadDetail:
        thread = ThreadRepo.get_thread(thread_id)
        if thread is None:
            raise ThreadNotFoundError(f"Thread not found for thread_id={thread_id}")
        messages = ThreadRepo.list_messages(thread_id=thread_id, limit=limit, offset=0)
        return ThreadDetail(thread=thread, messages=messages)

    @staticmethod
    def list_threads(limit: int = 20) -> list[ThreadOut]:
        return ThreadRepo.list_threads(limit=limit)

    @staticmethod
    def recompute_thread_summary(
        thread_id: str, store_thread: bool, mode: Literal["deterministic", "llm", "auto"]
    ) -> ThreadSummaryOut:
        if not store_thread:
            return ThreadSummaryOut(
                thread_id=thread_id,
                stored=False,
                summary=None,
                summary_updated_at=None,
                summary_version=SUMMARY_VERSION,
                mode_used=None,
            )

        thread = ThreadRepo.get_thread(thread_id)
        if thread is None:
            raise ThreadNotFoundError(f"Thread not found for thread_id={thread_id}")
        if not thread.consent_store:
            return ThreadSummaryOut(
                thread_id=thread_id,
                stored=False,
                summary=None,
                summary_updated_at=None,
                summary_version=SUMMARY_VERSION,
                mode_used=None,
            )

        existing_summary, _summary_updated_at, summary_version = ThreadRepo.get_thread_summary(thread_id)
        recent_messages = ThreadRepo.list_messages(thread_id=thread_id, limit=10, offset=0)
        deterministic_summary = summarize(existing_summary=existing_summary, recent_messages=recent_messages)

        mode_used: Literal["deterministic", "llm"] = "deterministic"
        summary_value = deterministic_summary
        should_try_llm = mode == "llm" or (mode == "auto" and bool(os.getenv("OPENAI_API_KEY")))
        if should_try_llm:
            summary_value, mode_used = refine_summary_with_llm(
                deterministic_summary=deterministic_summary,
                existing_summary=existing_summary,
                recent_messages=recent_messages,
            )

        summary_value = summary_value[:1200]
        timestamp = datetime.now(timezone.utc)
        timestamp_iso = timestamp.isoformat()
        ThreadRepo.set_thread_summary(
            thread_id=thread_id,
            summary=summary_value,
            summary_updated_at=timestamp_iso,
            summary_version=summary_version or SUMMARY_VERSION,
        )
        return ThreadSummaryOut(
            thread_id=thread_id,
            stored=True,
            summary=summary_value,
            summary_updated_at=timestamp,
            summary_version=summary_version or SUMMARY_VERSION,
            mode_used=mode_used,
        )

    @staticmethod
    def get_thread_summary(thread_id: str) -> ThreadSummaryOut:
        thread = ThreadRepo.get_thread(thread_id)
        if thread is None:
            raise ThreadNotFoundError(f"Thread not found for thread_id={thread_id}")
        if not thread.consent_store:
            return ThreadSummaryOut(
                thread_id=thread_id,
                stored=False,
                summary=None,
                summary_updated_at=None,
                summary_version=SUMMARY_VERSION,
                mode_used=None,
            )

        summary, summary_updated_at, summary_version = ThreadRepo.get_thread_summary(thread_id)
        parsed_timestamp = datetime.fromisoformat(summary_updated_at) if summary_updated_at else None
        return ThreadSummaryOut(
            thread_id=thread_id,
            stored=True,
            summary=summary,
            summary_updated_at=parsed_timestamp,
            summary_version=summary_version or SUMMARY_VERSION,
            mode_used=None,
        )

    @staticmethod
    def delete_thread(thread_id: str) -> None:
        deleted = ThreadRepo.delete_thread(thread_id=thread_id)
        if not deleted:
            raise ThreadNotFoundError(f"Thread not found for thread_id={thread_id}")
