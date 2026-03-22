from __future__ import annotations

import json
from typing import Any

from app.db.repo.audit_repo import AuditRepo
from app.models.advisor import AdvisorOutput
from app.models.narration import NarrationOutput


class AuditNotFoundError(Exception):
    pass


class AuditService:
    @staticmethod
    def trace_exists(trace_id: str) -> bool:
        return AuditRepo.trace_exists(trace_id)

    @staticmethod
    def record_evaluation(advisor_output: AdvisorOutput) -> None:
        created_at = None
        if advisor_output.meta.generated_at is not None:
            created_at = advisor_output.meta.generated_at.isoformat()

        record = {
            "trace_id": advisor_output.meta.trace_id,
            "created_at": created_at,
            "input_hash": advisor_output.meta.input_hash,
            "ruleset_version": advisor_output.meta.ruleset_version,
            "engine_version": advisor_output.meta.engine_version,
            "evaluation_json": json.dumps(advisor_output.model_dump(mode="json"), sort_keys=True),
            "narration_json": None,
            "narration_mode": None,
            "prompt_bundle_version": None,
        }
        AuditRepo.save_evaluation(record)

    @staticmethod
    def get_audit(trace_id: str) -> dict[str, Any]:
        record = AuditRepo.get_by_trace_id(trace_id)
        if record is None:
            raise AuditNotFoundError(f"Audit record not found for trace_id={trace_id}")
        return {
            "trace_id": record["trace_id"],
            "created_at": record["created_at"],
            "input_hash": record["input_hash"],
            "ruleset_version": record["ruleset_version"],
            "engine_version": record["engine_version"],
            "evaluation": json.loads(record["evaluation_json"]),
            "narration_json": json.loads(record["narration_json"]) if record["narration_json"] else None,
            "narration_mode": record["narration_mode"],
            "prompt_bundle_version": record["prompt_bundle_version"],
        }

    @staticmethod
    def list_recent(limit: int = 50) -> list[dict[str, Any]]:
        records = AuditRepo.list_recent(limit)
        summaries: list[dict[str, Any]] = []
        for record in records:
            evaluation = json.loads(record["evaluation_json"])
            job = evaluation.get("input", {}).get("job", {})
            summaries.append(
                {
                    "trace_id": record["trace_id"],
                    "created_at": record["created_at"],
                    "recommendation": evaluation.get("recommendation"),
                    "confidence_band": evaluation.get("confidence_band"),
                    "job_title": job.get("title"),
                    "company": job.get("company"),
                }
            )
        return summaries

    @staticmethod
    def record_narration(
        trace_id: str, narration_output: NarrationOutput, narration_mode: str, prompt_bundle_version: str
    ) -> None:
        updated = AuditRepo.attach_narration(
            trace_id=trace_id,
            narration_json=json.dumps(narration_output.model_dump(mode="json"), sort_keys=True),
            narration_mode=narration_mode,
            prompt_bundle_version=prompt_bundle_version,
        )
        if not updated:
            raise AuditNotFoundError(f"Audit record not found for trace_id={trace_id}")

    @staticmethod
    def delete_audit(trace_id: str) -> None:
        deleted = AuditRepo.delete_audit(trace_id)
        if not deleted:
            raise AuditNotFoundError(f"Audit record not found for trace_id={trace_id}")
