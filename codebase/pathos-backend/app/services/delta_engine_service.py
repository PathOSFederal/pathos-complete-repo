"""Deterministic delta detection and score-delta tracking for saved-search results."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.db.repo.saved_search_snapshot_repo import SavedSearchSnapshotRepo
from app.models.alert_digest import JobDelta

MEANINGFUL_SCORE_DELTA = 5


def canonical_job_fingerprint(job: dict[str, Any]) -> str:
    payload = {
        "id": job.get("id"),
        "title": job.get("title"),
        "organization": job.get("organization"),
        "locations": sorted(job.get("locations", [])),
        "compensation": job.get("compensation"),
        "open_date": job.get("open_date"),
        "close_date": job.get("close_date"),
        "apply_url": job.get("apply_url"),
        "mapper_version": job.get("source", {}).get("mapper_version"),
    }
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()


class DeltaEngineService:
    @staticmethod
    def classify_and_update_snapshots(
        *,
        saved_search_id: str,
        ranked_results: list[dict[str, Any]],
    ) -> dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        previous_rows = SavedSearchSnapshotRepo.list_by_saved_search(saved_search_id)
        previous_by_job = {str(row["job_id"]): row for row in previous_rows}
        current_ids: set[str] = set()

        deltas: list[JobDelta] = []
        counts = {"new": 0, "updated": 0, "unchanged": 0, "disappeared": 0}

        for row in ranked_results:
            job = row["job"]
            score_block = row["score"]
            job_id = str(job["id"])
            current_ids.add(job_id)
            fingerprint = canonical_job_fingerprint(job)
            score = int(score_block["final_score"])
            previous = previous_by_job.get(job_id)

            status = "new"
            score_delta = 0
            threshold_crossed = False
            if previous is not None:
                prev_fp = str(previous["last_fingerprint"])
                prev_score = int(previous["last_score"]) if previous.get("last_score") is not None else score
                score_delta = score - prev_score
                if prev_fp == fingerprint and score_delta == 0:
                    status = "unchanged"
                    counts["unchanged"] += 1
                else:
                    status = "updated"
                    counts["updated"] += 1
                threshold_crossed = abs(score_delta) >= MEANINGFUL_SCORE_DELTA
            else:
                counts["new"] += 1

            SavedSearchSnapshotRepo.upsert(
                record_id=str(uuid4()),
                saved_search_id=saved_search_id,
                job_id=job_id,
                seen_at=now,
                fingerprint=fingerprint,
                score=score,
            )
            deltas.append(
                JobDelta(
                    job_id=job_id,
                    status=status,
                    score_delta=score_delta,
                    threshold_crossed=threshold_crossed,
                )
            )

        disappeared = sorted(set(previous_by_job.keys()) - current_ids)
        counts["disappeared"] = len(disappeared)
        for job_id in disappeared:
            deltas.append(
                JobDelta(
                    job_id=job_id,
                    status="disappeared",
                    score_delta=0,
                    threshold_crossed=False,
                )
            )

        ordered_deltas = sorted(
            deltas,
            key=lambda item: (item.status, item.job_id),
        )
        return {
            "counts": counts,
            "deltas": [item.model_dump(mode="json") for item in ordered_deltas],
        }
