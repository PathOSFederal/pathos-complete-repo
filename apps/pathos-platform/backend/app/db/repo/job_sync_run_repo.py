"""Repository helpers for USAJOBS sync validation run summaries."""

from __future__ import annotations

import json
import re
from typing import Any

from app.db.connection import connect, init_db


SENSITIVE_KEY_PARTS = (
    "api_key",
    "apikey",
    "authorization",
    "credential",
    "database_url",
    "dsn",
    "header",
    "password",
    "payload",
    "raw",
    "secret",
    "token",
)

STRINGIFIED_HEADERS_RE = re.compile(
    r"(?i)\b(headers?|provider_headers|request_headers)\s*[:=]\s*\{[^}\r\n]*\}"
)
AUTH_VALUE_RE = re.compile(
    r"(?i)\b(authorization(?:-key)?|x-api-key)(\s*[:=]\s*)"
    r"(?:\"[^\"]*\"|'[^']*'|[^\r\n,;}]+)"
)
SECRET_VALUE_RE = re.compile(
    r"(?i)\b(api[_-]?key|usajobs_api_key|password|secret|token)(\s*[:=]\s*)"
    r"(?:\"[^\"]*\"|'[^']*'|[^\s,;}]+)"
)
BEARER_VALUE_RE = re.compile(r"(?i)\bbearer\s+[A-Za-z0-9._~+\-/=]+")
CREDENTIAL_URL_RE = re.compile(
    r"(?i)\b[a-z][a-z0-9+.-]*://[^/\s:@]+:[^@\s]+@[^\s,;]+"
)
DB_URL_RE = re.compile(r"(?i)\b(?:postgres(?:ql)?|mysql|mssql|sqlite)://[^\s,;]+")
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")


def _redact_stringified_headers(match: re.Match[str]) -> str:
    """Drop stringified provider header dictionaries before individual tokens can leak."""

    return f"{match.group(1)}=[REDACTED]"


def _sanitize_text(value: object) -> str:
    """Remove credentials, raw transport details, and stack frames from operator text."""

    text = str(value)
    text = STRINGIFIED_HEADERS_RE.sub(_redact_stringified_headers, text)
    text = DB_URL_RE.sub("[REDACTED_DB_URL]", text)
    text = CREDENTIAL_URL_RE.sub("[REDACTED_URL]", text)
    text = AUTH_VALUE_RE.sub(r"\1\2[REDACTED]", text)
    text = SECRET_VALUE_RE.sub(r"\1\2[REDACTED]", text)
    text = BEARER_VALUE_RE.sub("Bearer [REDACTED]", text)
    text = EMAIL_RE.sub("[REDACTED_EMAIL]", text)
    safe_lines: list[str] = []
    for line in text.splitlines():
        stripped = line.strip()
        lowered = stripped.lower()
        if not stripped:
            continue
        if lowered.startswith("traceback"):
            continue
        if lowered.startswith("file ") or lowered.startswith('file "'):
            continue
        if lowered.startswith("raise "):
            continue
        if "site-packages" in lowered:
            continue
        safe_lines.append(stripped)
    return " | ".join(safe_lines)[:500]


def _partition_json(raw_value: object, *, field_name: str) -> list[Any]:
    """Decode partition JSON without letting malformed rows break ops health."""

    try:
        decoded = json.loads(str(raw_value))
    except (TypeError, ValueError, json.JSONDecodeError):
        return [
            {
                "reason": f"malformed_{field_name}",
                "detail": "partition summary unavailable",
            }
        ]
    if isinstance(decoded, list):
        return decoded
    return [
        {
            "reason": f"malformed_{field_name}",
            "detail": "partition summary unavailable",
        }
    ]


def _sanitize_value(value: Any, *, key_name: str = "") -> Any:
    """Recursively strip unsafe fields from health payloads."""

    lowered_key = key_name.lower()
    for sensitive_part in SENSITIVE_KEY_PARTS:
        if sensitive_part in lowered_key:
            return "[REDACTED]"
    if isinstance(value, dict):
        return {
            str(child_key): _sanitize_value(child_value, key_name=str(child_key))
            for child_key, child_value in value.items()
        }
    if isinstance(value, list):
        return [_sanitize_value(item) for item in value]
    if isinstance(value, str):
        return _sanitize_text(value)
    return value


def _health_status(*, sync_status: str, failed_partitions: list[Any], stale_partitions: list[Any]) -> str:
    """Map raw sync rows into operator-facing health labels."""

    if sync_status == "failed":
        return "failed"
    if failed_partitions:
        return "degraded"
    if _has_malformed_partition(stale_partitions):
        return "degraded"
    if stale_partitions:
        return "stale"
    return "healthy"


def _has_malformed_partition(partitions: list[Any]) -> bool:
    """Treat malformed stored partition summaries as degraded, not ordinary stale state."""

    for partition in partitions:
        if isinstance(partition, dict):
            reason = partition.get("reason")
            if isinstance(reason, str) and reason.startswith("malformed_"):
                return True
    return False


def _first_partition_reason(partitions: list[Any]) -> str | None:
    """Extract the first stale/failed reason without exposing raw partition detail."""

    for partition in partitions:
        if isinstance(partition, dict):
            reason = partition.get("reason")
            if isinstance(reason, str) and reason:
                return _sanitize_text(reason)
    return None


class JobSyncRunRepo:
    """Persist and expose staging-safe sync run health records."""

    @staticmethod
    def _insert(conn: Any, record: dict[str, Any]) -> None:
        conn.execute(
            """
            INSERT INTO job_sync_runs (
                id,
                saved_search_id,
                source,
                trigger_mode,
                run_mode,
                status,
                started_at,
                completed_at,
                records_fetched,
                new_jobs,
                updated_jobs,
                unchanged_jobs,
                closed_jobs,
                failed_partitions_json,
                stale_partitions_json,
                alert_events_queued,
                indexing_events_queued,
                duration_ms,
                error_summary
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                record["id"],
                record.get("saved_search_id"),
                record["source"],
                record["trigger_mode"],
                record["run_mode"],
                record["status"],
                record["started_at"],
                record["completed_at"],
                int(record["records_fetched"]),
                int(record["new_jobs"]),
                int(record["updated_jobs"]),
                int(record["unchanged_jobs"]),
                int(record["closed_jobs"]),
                json.dumps(record.get("failed_partitions", []), sort_keys=True),
                json.dumps(record.get("stale_partitions", []), sort_keys=True),
                int(record["alert_events_queued"]),
                int(record["indexing_events_queued"]),
                int(record["duration_ms"]),
                record.get("error_summary"),
            ),
        )

    @staticmethod
    def create(record: dict[str, Any], *, connection: Any | None = None) -> None:
        """Insert one sync run summary row."""

        if connection is not None:
            JobSyncRunRepo._insert(connection, record)
            return

        init_db()
        with connect() as conn:
            JobSyncRunRepo._insert(conn, record)
            conn.commit()

    @staticmethod
    def update_event_counts(
        *,
        sync_run_id: str,
        alert_events_queued: int,
        indexing_events_queued: int,
        connection: Any | None = None,
    ) -> None:
        """Update queue counters after deduped outbox insertion completes."""

        if connection is not None:
            connection.execute(
                """
                UPDATE job_sync_runs
                SET
                    alert_events_queued = ?,
                    indexing_events_queued = ?
                WHERE id = ?
                """,
                (int(alert_events_queued), int(indexing_events_queued), sync_run_id),
            )
            return

        init_db()
        with connect() as conn:
            conn.execute(
                """
                UPDATE job_sync_runs
                SET
                    alert_events_queued = ?,
                    indexing_events_queued = ?
                WHERE id = ?
                """,
                (int(alert_events_queued), int(indexing_events_queued), sync_run_id),
            )
            conn.commit()

    @staticmethod
    def latest_health() -> dict[str, Any]:
        """Return the latest sync health shape expected by staging operators."""

        init_db()
        with connect() as conn:
            row = conn.execute(
                """
                SELECT
                    id,
                    saved_search_id,
                    source,
                    trigger_mode,
                    run_mode,
                    status,
                    completed_at,
                    records_fetched,
                    new_jobs,
                    updated_jobs,
                    unchanged_jobs,
                    closed_jobs,
                    failed_partitions_json,
                    stale_partitions_json,
                    alert_events_queued,
                    indexing_events_queued,
                    duration_ms,
                    error_summary
                FROM job_sync_runs
                ORDER BY completed_at DESC
                LIMIT 1
                """
            ).fetchone()
            success_row = conn.execute(
                """
                SELECT completed_at
                FROM job_sync_runs
                WHERE status = 'success'
                ORDER BY completed_at DESC
                LIMIT 1
                """
            ).fetchone()
        if row is None:
            return {
                "status": "never_run",
                "last_sync_time": None,
                "last_success_time": None,
                "records_fetched": 0,
                "new_jobs": 0,
                "updated_jobs": 0,
                "closed_jobs": 0,
                "failed_partitions": [],
                "stale_partitions": [],
                "alert_events_queued": 0,
                "indexing_events_queued": 0,
                "duration_ms": 0,
                "error_summary": None,
                "close_missing_skipped": False,
                "close_missing_skip_reason": None,
            }

        payload = dict(row)
        failed_partitions = _sanitize_value(
            _partition_json(
                payload["failed_partitions_json"],
                field_name="failed_partitions_json",
            ),
            key_name="failed_partitions",
        )
        stale_partitions = _sanitize_value(
            _partition_json(
                payload["stale_partitions_json"],
                field_name="stale_partitions_json",
            ),
            key_name="stale_partitions",
        )
        safe_error_summary = None
        if payload.get("error_summary") is not None:
            safe_error_summary = _sanitize_text(payload["error_summary"])
        close_missing_skip_reason = _first_partition_reason(stale_partitions)
        return {
            "status": _health_status(
                sync_status=str(payload["status"]),
                failed_partitions=failed_partitions,
                stale_partitions=stale_partitions,
            ),
            "sync_run_status": payload["status"],
            "last_sync_time": payload["completed_at"],
            "last_success_time": None if success_row is None else success_row["completed_at"],
            "records_fetched": int(payload["records_fetched"]),
            "new_jobs": int(payload["new_jobs"]),
            "updated_jobs": int(payload["updated_jobs"]),
            "closed_jobs": int(payload["closed_jobs"]),
            "failed_partitions": failed_partitions,
            "stale_partitions": stale_partitions,
            "alert_events_queued": int(payload["alert_events_queued"]),
            "indexing_events_queued": int(payload["indexing_events_queued"]),
            "duration_ms": int(payload["duration_ms"]),
            "error_summary": safe_error_summary,
            "close_missing_skipped": bool(stale_partitions),
            "close_missing_skip_reason": close_missing_skip_reason,
            "run_mode": payload["run_mode"],
            "trigger_mode": payload["trigger_mode"],
            "source": payload["source"],
            "saved_search_id": payload.get("saved_search_id"),
        }
