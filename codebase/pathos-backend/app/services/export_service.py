from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime, timezone

from app.core.logging import log_event
from app.db.repo.audit_repo import AuditRepo
from app.db.repo.thread_repo import ThreadRepo
from app.services.audit_service import AuditNotFoundError
from app.services.thread_service import ThreadNotFoundError

logger = logging.getLogger("pathos.export")


class ExportService:
    @staticmethod
    def _canonical_export_json(payload: dict) -> str:
        return json.dumps(payload, sort_keys=True, separators=(",", ":"))

    @staticmethod
    def _with_integrity_metadata(payload: dict, *, export_type: str) -> dict:
        canonical_json = ExportService._canonical_export_json(payload)
        export_hash = hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()
        log_event(
            logger,
            level=logging.INFO,
            event_id="export_generated",
            message="Export payload generated with deterministic integrity hash.",
            details={
                "export_type": export_type,
                "export_hash": export_hash,
                "hash_alg": "sha256",
            },
        )
        log_event(
            logger,
            level=logging.INFO,
            event_id="export_hash_generated",
            message="Export hash generated for deterministic integrity verification.",
            details={
                "export_type": export_type,
                "export_hash": export_hash,
                "hash_alg": "sha256",
            },
        )
        return {
            **payload,
            "export_hash": export_hash,
            "hash_alg": "sha256",
            "export_bytes": len(canonical_json.encode("utf-8")),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    @staticmethod
    def export_thread(thread_id: str) -> dict:
        thread = ThreadRepo.get_thread_record(thread_id=thread_id)
        if thread is None:
            raise ThreadNotFoundError(f"Thread not found for thread_id={thread_id}")
        thread["consent_store"] = bool(thread["consent_store"])

        messages = ThreadRepo.list_thread_messages(thread_id=thread_id)
        trace_ids = sorted(
            {message["trace_id"] for message in messages if message.get("trace_id")}
        )
        linked_audits = AuditRepo.get_audits_by_trace_ids(trace_ids=trace_ids)
        payload = {
            "thread": thread,
            "messages": messages,
            "linked_audits": linked_audits,
        }
        return ExportService._with_integrity_metadata(
            payload, export_type="thread_export"
        )

    @staticmethod
    def export_audit(trace_id: str) -> dict:
        audit = AuditRepo.get_by_trace_id(trace_id=trace_id)
        if audit is None:
            raise AuditNotFoundError(f"Audit record not found for trace_id={trace_id}")
        return ExportService._with_integrity_metadata(audit, export_type="audit_export")

    @staticmethod
    def export_recent(limit: int = 20) -> dict:
        threads = ThreadRepo.list_thread_records(limit=limit)
        audits = AuditRepo.list_recent_audits(limit=limit)
        payload = {
            "threads": [
                {
                    "thread_id": thread["thread_id"],
                    "updated_at": thread["updated_at"],
                    "title": thread["title"],
                    "consent_store": bool(thread["consent_store"]),
                }
                for thread in threads
            ],
            "audits": [
                {
                    "trace_id": audit["trace_id"],
                    "created_at": audit["created_at"],
                    "ruleset_version": audit["ruleset_version"],
                    "engine_version": audit["engine_version"],
                }
                for audit in audits
            ],
        }
        return ExportService._with_integrity_metadata(
            payload, export_type="recent_export"
        )
