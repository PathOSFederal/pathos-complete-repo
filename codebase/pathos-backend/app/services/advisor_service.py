from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from uuid import uuid4

from app.engine.evaluator import ENGINE_VERSION, evaluate_advisor_input
from app.engine.reason_library import RULESET_VERSION
from app.models.advisor import AdvisorInput, AdvisorOutput
from app.services.audit_service import AuditService


class AdvisorService:
    @staticmethod
    def evaluate(advisor_input: AdvisorInput) -> AdvisorOutput:
        output = evaluate_advisor_input(advisor_input)
        canonical_json = json.dumps(advisor_input.model_dump(mode="json"), sort_keys=True, separators=(",", ":"))
        generated_at = datetime.now(timezone.utc)
        output.meta.trace_id = str(uuid4())
        output.meta.input_hash = hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()
        output.meta.engine_version = ENGINE_VERSION
        output.meta.ruleset_version = RULESET_VERSION
        output.meta.generated_at = generated_at
        AuditService.record_evaluation(output)
        return output
