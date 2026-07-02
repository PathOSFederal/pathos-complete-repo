"""app.db.repo.upstream_audit_repo

WHY THIS FILE EXISTS:
This repository persists upstream API audit entries for external integrations.
It provides traceability for deterministic ingestion without leaking secrets.

LAYER FIT:
- Repository/persistence layer only.

WHAT THIS FILE MUST NOT DO:
- Must not perform HTTP calls.
- Must not import FastAPI request objects.
- Must not perform business decisions about retry/filtering.
"""

from __future__ import annotations

import json
from hashlib import sha256
from typing import Any

from app.db.connection import connect, init_db


class UpstreamAuditRepo:
    """Persistence helper for `upstream_api_audit_records` rows."""

    @staticmethod
    def _canonical_payload_json(raw_payload: dict[str, Any] | None) -> str | None:
        if raw_payload is None:
            return None
        return json.dumps(raw_payload, sort_keys=True, separators=(",", ":"))

    @staticmethod
    def _raw_payload_hash(raw_payload_json: str | None) -> str | None:
        if raw_payload_json is None:
            return None
        return sha256(raw_payload_json.encode("utf-8")).hexdigest()

    @staticmethod
    def _assert_row_integrity(row: dict[str, Any]) -> None:
        payload_json = row.get("payload_json")
        payload_hash = row.get("response_sha256")
        if payload_json is None or payload_hash is None:
            return
        recomputed_hash = UpstreamAuditRepo._raw_payload_hash(str(payload_json))
        if recomputed_hash != str(payload_hash):
            row_id = row.get("id", "unknown")
            raise ValueError(
                f"Upstream payload integrity mismatch detected for upstream audit id={row_id}."
            )

    @staticmethod
    def save_record(record: dict[str, Any]) -> dict[str, str | None]:
        """Insert one upstream audit row.

        Inputs:
        - Deterministic record dict prepared by service/adapter boundary.

        Outputs:
        - Persisted audit identifiers and raw payload hash for provenance chaining.

        Error behavior:
        - Propagates sqlite errors to caller.
        """
        raw_payload = record.get("upstream_raw_payload")
        raw_payload_json = None
        if isinstance(raw_payload, dict):
            raw_payload_json = UpstreamAuditRepo._canonical_payload_json(raw_payload)
        raw_payload_hash = UpstreamAuditRepo._raw_payload_hash(raw_payload_json)
        init_db()
        with connect() as conn:
            conn.execute(
                """
                INSERT INTO upstream_api_audit_records (
                    id,
                    request_id,
                    created_at,
                    endpoint,
                    query_params_json,
                    status_code,
                    duration_ms,
                    response_bytes,
                    truncated,
                    response_sha256,
                    payload_json,
                    query_hash,
                    latency_ms,
                    result_count,
                    error_class
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record["id"],
                    record["request_id"],
                    record["created_at"],
                    record["endpoint"],
                    # Backward-compatible legacy column: store hash only (never raw query params).
                    record["query_hash"],
                    record["status_code"],
                    record["latency_ms"],
                    len(raw_payload_json.encode("utf-8")) if raw_payload_json else 0,
                    0,
                    raw_payload_hash if raw_payload_hash else record["query_hash"],
                    raw_payload_json,
                    record["query_hash"],
                    record["latency_ms"],
                    record["result_count"],
                    record.get("error_class"),
                ),
            )
            conn.commit()
        return {
            "id": str(record["id"]),
            "upstream_raw_hash": raw_payload_hash,
            "upstream_raw_payload_json": raw_payload_json,
        }

    @staticmethod
    def list_recent(limit: int = 20) -> list[dict[str, Any]]:
        """Return recent upstream audit rows in deterministic order for tests/tools."""

        bounded_limit = max(1, min(limit, 200))
        init_db()
        with connect() as conn:
            rows = conn.execute(
                """
                SELECT
                    id,
                    request_id,
                    created_at,
                    endpoint,
                    query_hash,
                    status_code,
                    latency_ms,
                    result_count,
                    error_class,
                    payload_json,
                    response_sha256
                FROM upstream_api_audit_records
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (bounded_limit,),
            ).fetchall()
        parsed_rows = [dict(row) for row in rows]
        for row in parsed_rows:
            UpstreamAuditRepo._assert_row_integrity(row)
            row["upstream_raw_payload_json"] = row.get("payload_json")
            row["upstream_raw_hash"] = row.get("response_sha256")
        return parsed_rows

    @staticmethod
    def purge_older_than(cutoff_ts: str) -> int:
        init_db()
        with connect() as conn:
            cursor = conn.execute(
                "DELETE FROM upstream_api_audit_records WHERE created_at < ?",
                (cutoff_ts,),
            )
            conn.commit()
            return int(cursor.rowcount)
