"""Persistence for bounded saved-search USAJOBS canonical records."""

from __future__ import annotations

import json
from hashlib import sha256
from typing import Any, Literal
from uuid import uuid4

from app.db.connection import connect, init_db


UpsertOutcome = Literal["new", "updated", "unchanged"]


class SavedSearchIngestedJobRepo:
    """Store bounded canonical job records plus provenance for one saved search."""

    @staticmethod
    def _hashable_canonical_job(canonical_job: dict[str, Any]) -> dict[str, Any]:
        """Remove source-observation fields that should not create false updates."""

        normalized: dict[str, Any] = {}
        for key, value in canonical_job.items():
            if key == "source" and isinstance(value, dict):
                source_payload: dict[str, Any] = {}
                for source_key, source_value in value.items():
                    if source_key != "retrieved_at":
                        source_payload[source_key] = source_value
                normalized[key] = source_payload
                continue
            normalized[key] = value
        return normalized

    @staticmethod
    def _canonical_job_json(canonical_job: dict[str, Any]) -> str:
        comparable = SavedSearchIngestedJobRepo._hashable_canonical_job(canonical_job)
        return json.dumps(comparable, sort_keys=True, separators=(",", ":"))

    @staticmethod
    def _job_hash(canonical_job_json: str) -> str:
        return sha256(canonical_job_json.encode("utf-8")).hexdigest()

    @staticmethod
    def canonical_hash(canonical_job: dict[str, Any]) -> str:
        """Return the stable content hash used for meaningful change detection."""

        canonical_job_json = SavedSearchIngestedJobRepo._canonical_job_json(canonical_job)
        return SavedSearchIngestedJobRepo._job_hash(canonical_job_json)

    @staticmethod
    def _stored_job_json(canonical_job: dict[str, Any]) -> str:
        return json.dumps(canonical_job, sort_keys=True, separators=(",", ":"))

    @staticmethod
    def _changed_fields(
        previous_job: dict[str, Any],
        next_job: dict[str, Any],
    ) -> list[str]:
        """Return canonical fields that changed in ways operators care about."""

        comparable_fields = [
            "title",
            "organization",
            "agency",
            "department",
            "series",
            "pay_plan",
            "locations",
            "compensation",
            "open_date",
            "close_date",
            "apply_url",
            "source_url",
            "remote_status",
            "telework_status",
            "documents",
            "qualifications",
            "duties",
            "who_may_apply",
            "hiring_path",
            "status",
        ]
        changed: list[str] = []
        for field_name in comparable_fields:
            previous_value = previous_job.get(field_name)
            next_value = next_job.get(field_name)
            if previous_value != next_value:
                changed.append(field_name)
        return changed

    @staticmethod
    def _insert_change_log(
        conn,
        *,
        sync_run_id: str | None,
        saved_search_id: str,
        job_id: str,
        change_type: str,
        changed_fields: list[str],
        previous_hash: str | None,
        new_hash: str | None,
        source_slice_json: str,
        upstream_audit_id: str | None,
        created_at: str,
    ) -> None:
        conn.execute(
            """
            INSERT INTO job_change_log (
                id,
                sync_run_id,
                saved_search_id,
                job_id,
                change_type,
                changed_fields_json,
                previous_hash,
                new_hash,
                source_slice_json,
                upstream_audit_id,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                str(uuid4()),
                sync_run_id,
                saved_search_id,
                job_id,
                change_type,
                json.dumps(changed_fields, sort_keys=True),
                previous_hash,
                new_hash,
                source_slice_json,
                upstream_audit_id,
                created_at,
            ),
        )

    @staticmethod
    def list_by_saved_search(saved_search_id: str) -> list[dict[str, Any]]:
        init_db()
        with connect() as conn:
            rows = conn.execute(
                """
                SELECT
                    id,
                    saved_search_id,
                    job_id,
                    source,
                    source_slice_json,
                    mapper_version,
                    query_fingerprint,
                    upstream_audit_id,
                    upstream_raw_hash,
                    canonical_job_sha256,
                    canonical_job_json,
                    ingest_warnings_json,
                    lifecycle_state,
                    closed_at,
                    first_ingested_at,
                    last_ingested_at,
                    last_seen_at,
                    last_changed_at,
                    unchanged_run_count
                FROM saved_search_ingested_jobs
                WHERE saved_search_id = ?
                ORDER BY job_id ASC
                """,
                (saved_search_id,),
            ).fetchall()
        return [dict(row) for row in rows]

    @staticmethod
    def upsert(
        *,
        record_id: str,
        saved_search_id: str,
        job_id: str,
        source: str,
        source_slice: dict[str, Any],
        mapper_version: str,
        query_fingerprint: str,
        upstream_audit_id: str | None,
        upstream_raw_hash: str | None,
        canonical_job: dict[str, Any],
        ingest_warnings: list[str] | tuple[str, ...],
        seen_at: str,
        sync_run_id: str | None = None,
    ) -> UpsertOutcome:
        canonical_job_json = SavedSearchIngestedJobRepo._canonical_job_json(canonical_job)
        canonical_job_sha256 = SavedSearchIngestedJobRepo._job_hash(canonical_job_json)
        stored_job_json = SavedSearchIngestedJobRepo._stored_job_json(canonical_job)
        source_slice_json = json.dumps(source_slice, sort_keys=True, separators=(",", ":"))
        warnings_json = json.dumps(sorted(set(str(item) for item in ingest_warnings)), sort_keys=True)
        init_db()
        with connect() as conn:
            existing = conn.execute(
                """
                SELECT
                    id,
                    canonical_job_sha256,
                    canonical_job_json,
                    unchanged_run_count,
                    first_ingested_at,
                    lifecycle_state
                FROM saved_search_ingested_jobs
                WHERE saved_search_id = ? AND job_id = ?
                """,
                (saved_search_id, job_id),
            ).fetchone()
            if existing is None:
                conn.execute(
                    """
                    INSERT INTO saved_search_ingested_jobs (
                        id,
                        saved_search_id,
                        job_id,
                        source,
                        source_slice_json,
                        mapper_version,
                        query_fingerprint,
                        upstream_audit_id,
                        upstream_raw_hash,
                        canonical_job_sha256,
                        canonical_job_json,
                        ingest_warnings_json,
                        lifecycle_state,
                        closed_at,
                        first_ingested_at,
                        last_ingested_at,
                        last_seen_at,
                        last_changed_at,
                        unchanged_run_count
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        record_id,
                        saved_search_id,
                        job_id,
                        source,
                        source_slice_json,
                        mapper_version,
                        query_fingerprint,
                        upstream_audit_id,
                        upstream_raw_hash,
                        canonical_job_sha256,
                        stored_job_json,
                        warnings_json,
                        "open",
                        None,
                        seen_at,
                        seen_at,
                        seen_at,
                        seen_at,
                        0,
                    ),
                )
                SavedSearchIngestedJobRepo._insert_change_log(
                    conn,
                    sync_run_id=sync_run_id,
                    saved_search_id=saved_search_id,
                    job_id=job_id,
                    change_type="new",
                    changed_fields=SavedSearchIngestedJobRepo._changed_fields({}, canonical_job),
                    previous_hash=None,
                    new_hash=canonical_job_sha256,
                    source_slice_json=source_slice_json,
                    upstream_audit_id=upstream_audit_id,
                    created_at=seen_at,
                )
                conn.commit()
                return "new"

            previous_hash = str(existing["canonical_job_sha256"])
            unchanged_count = int(existing["unchanged_run_count"])
            if previous_hash == canonical_job_sha256:
                outcome: UpsertOutcome = "unchanged"
                next_unchanged_count = unchanged_count + 1
                changed_fields: list[str] = []
                last_changed_at = None
            else:
                outcome = "updated"
                next_unchanged_count = 0
                previous_job = json.loads(str(existing["canonical_job_json"]))
                changed_fields = SavedSearchIngestedJobRepo._changed_fields(
                    previous_job,
                    canonical_job,
                )
                last_changed_at = seen_at
            conn.execute(
                """
                UPDATE saved_search_ingested_jobs
                SET
                    source = ?,
                    source_slice_json = ?,
                    mapper_version = ?,
                    query_fingerprint = ?,
                    upstream_audit_id = ?,
                    upstream_raw_hash = ?,
                    canonical_job_sha256 = ?,
                    canonical_job_json = ?,
                    ingest_warnings_json = ?,
                    lifecycle_state = ?,
                    closed_at = ?,
                    last_ingested_at = ?,
                    last_seen_at = ?,
                    last_changed_at = CASE
                        WHEN ? IS NULL THEN last_changed_at
                        ELSE ?
                    END,
                    unchanged_run_count = ?
                WHERE saved_search_id = ? AND job_id = ?
                """,
                (
                    source,
                    source_slice_json,
                    mapper_version,
                    query_fingerprint,
                    upstream_audit_id,
                    upstream_raw_hash,
                    canonical_job_sha256,
                    stored_job_json,
                    warnings_json,
                    "open",
                    None,
                    seen_at,
                    seen_at,
                    last_changed_at,
                    last_changed_at,
                    next_unchanged_count,
                    saved_search_id,
                    job_id,
                ),
            )
            if outcome == "updated":
                SavedSearchIngestedJobRepo._insert_change_log(
                    conn,
                    sync_run_id=sync_run_id,
                    saved_search_id=saved_search_id,
                    job_id=job_id,
                    change_type="updated",
                    changed_fields=changed_fields,
                    previous_hash=previous_hash,
                    new_hash=canonical_job_sha256,
                    source_slice_json=source_slice_json,
                    upstream_audit_id=upstream_audit_id,
                    created_at=seen_at,
                )
            conn.commit()
            return outcome

    @staticmethod
    def preview_outcome(
        *,
        saved_search_id: str,
        job_id: str,
        canonical_job: dict[str, Any],
    ) -> UpsertOutcome:
        """Classify an ingest outcome without writing any staging data."""

        canonical_job_json = SavedSearchIngestedJobRepo._canonical_job_json(canonical_job)
        canonical_job_sha256 = SavedSearchIngestedJobRepo._job_hash(canonical_job_json)
        init_db()
        with connect() as conn:
            existing = conn.execute(
                """
                SELECT canonical_job_sha256
                FROM saved_search_ingested_jobs
                WHERE saved_search_id = ? AND job_id = ?
                """,
                (saved_search_id, job_id),
            ).fetchone()
        if existing is None:
            return "new"
        if str(existing["canonical_job_sha256"]) == canonical_job_sha256:
            return "unchanged"
        return "updated"

    @staticmethod
    def mark_missing_as_closed(
        *,
        saved_search_id: str,
        seen_job_ids: list[str],
        closed_at: str,
        source_slice: dict[str, Any],
        upstream_audit_id: str | None,
        sync_run_id: str | None = None,
    ) -> int:
        """Close jobs absent from a complete partition and log lifecycle changes."""

        closed_jobs = SavedSearchIngestedJobRepo.mark_missing_as_closed_jobs(
            saved_search_id=saved_search_id,
            seen_job_ids=seen_job_ids,
            closed_at=closed_at,
            source_slice=source_slice,
            upstream_audit_id=upstream_audit_id,
            sync_run_id=sync_run_id,
        )
        return len(closed_jobs)

    @staticmethod
    def mark_missing_as_closed_jobs(
        *,
        saved_search_id: str,
        seen_job_ids: list[str],
        closed_at: str,
        source_slice: dict[str, Any],
        upstream_audit_id: str | None,
        sync_run_id: str | None = None,
    ) -> list[dict[str, str]]:
        """Close missing jobs and return the exact rows that changed state."""

        source_slice_json = json.dumps(source_slice, sort_keys=True, separators=(",", ":"))
        init_db()
        with connect() as conn:
            rows = conn.execute(
                """
                SELECT job_id, canonical_job_sha256
                FROM saved_search_ingested_jobs
                WHERE saved_search_id = ? AND lifecycle_state = 'open'
                """,
                (saved_search_id,),
            ).fetchall()
            seen_ids = set(seen_job_ids)
            closed_jobs: list[dict[str, str]] = []
            for row in rows:
                job_id = str(row["job_id"])
                if job_id in seen_ids:
                    continue
                previous_hash = str(row["canonical_job_sha256"])
                conn.execute(
                    """
                    UPDATE saved_search_ingested_jobs
                    SET
                        lifecycle_state = 'closed',
                        closed_at = ?,
                        last_ingested_at = ?,
                        last_changed_at = ?
                    WHERE saved_search_id = ? AND job_id = ?
                    """,
                    (closed_at, closed_at, closed_at, saved_search_id, job_id),
                )
                SavedSearchIngestedJobRepo._insert_change_log(
                    conn,
                    sync_run_id=sync_run_id,
                    saved_search_id=saved_search_id,
                    job_id=job_id,
                    change_type="closed",
                    changed_fields=["lifecycle_state"],
                    previous_hash=previous_hash,
                    new_hash=previous_hash,
                    source_slice_json=source_slice_json,
                    upstream_audit_id=upstream_audit_id,
                    created_at=closed_at,
                )
                closed_jobs.append(
                    {
                        "job_id": job_id,
                        "canonical_job_sha256": previous_hash,
                    }
                )
            conn.commit()
            return closed_jobs

    @staticmethod
    def list_change_log(saved_search_id: str) -> list[dict[str, Any]]:
        """Return change-log rows for deterministic tests and operator checks."""

        init_db()
        with connect() as conn:
            rows = conn.execute(
                """
                SELECT
                    id,
                    sync_run_id,
                    saved_search_id,
                    job_id,
                    change_type,
                    changed_fields_json,
                    previous_hash,
                    new_hash,
                    source_slice_json,
                    upstream_audit_id,
                    created_at
                FROM job_change_log
                WHERE saved_search_id = ?
                ORDER BY created_at ASC, job_id ASC, change_type ASC
                """,
                (saved_search_id,),
            ).fetchall()
        return [dict(row) for row in rows]
