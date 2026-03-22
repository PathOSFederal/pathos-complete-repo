"""Build deterministic digest payloads from rule evaluations."""

from __future__ import annotations

from collections import Counter
from typing import Any

from app.models.alert_digest import AlertDigestPayload


class DigestBuilderService:
    @staticmethod
    def build_digest_payload(
        *,
        run_metadata: dict[str, Any],
        ranked_results: list[dict[str, Any]],
        decisions: list[dict[str, Any]],
        deltas: list[dict[str, Any]],
    ) -> AlertDigestPayload:
        decision_by_job = {str(item["job_id"]): item for item in decisions}
        delta_by_job = {str(item["job_id"]): item for item in deltas}

        top_candidates = []
        for row in ranked_results:
            job = row["job"]
            score = row["score"]
            job_id = str(job["id"])
            decision = decision_by_job.get(job_id, {})
            delta = delta_by_job.get(job_id, {})
            top_candidates.append(
                {
                    "job_id": job_id,
                    "title": job.get("title"),
                    "organization": job.get("organization"),
                    "score": int(score["final_score"]),
                    "triggered": bool(decision.get("triggered", False)),
                    "delta_status": delta.get("status", "unknown"),
                    "score_delta": int(delta.get("score_delta", 0)),
                }
            )

        top_jobs = sorted(
            top_candidates,
            key=lambda item: (-item["score"], item["job_id"], str(item.get("title") or "")),
        )[:10]

        reasons_counter: Counter[str] = Counter()
        risks_counter: Counter[str] = Counter()
        for row in ranked_results:
            for reason in row["score"].get("reasons", []):
                reasons_counter[str(reason["code"])] += 1
            for risk in row["score"].get("risks", []):
                risks_counter[str(risk["code"])] += 1

        reasons_summary = sorted(reasons_counter.keys())
        risks_summary = sorted(risks_counter.keys())
        totals = {
            "new": sum(1 for d in deltas if d.get("status") == "new"),
            "updated": sum(1 for d in deltas if d.get("status") == "updated"),
            "unchanged": sum(1 for d in deltas if d.get("status") == "unchanged"),
            "disappeared": sum(1 for d in deltas if d.get("status") == "disappeared"),
            "above_threshold": sum(1 for d in decisions if d.get("triggered")),
            "suppressed": sum(1 for d in decisions if not d.get("triggered")),
        }

        return AlertDigestPayload(
            totals=totals,
            top_jobs=top_jobs,
            reasons_summary=reasons_summary,
            risks_summary=risks_summary,
            run_metadata=run_metadata,
        )
