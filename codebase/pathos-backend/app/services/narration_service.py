from __future__ import annotations

import logging

from app.core.logging import log_event
from app.llm.narrator import PROMPT_BUNDLE_VERSION, narrate_with_fallback
from app.models.advisor import AdvisorOutput
from app.models.narration import NarrationOutput
from app.services.audit_service import AuditService

logger = logging.getLogger("pathos.narration")


class NarrationService:
    @staticmethod
    def narrate(
        evaluation: AdvisorOutput, tone: str | None = None
    ) -> tuple[NarrationOutput, str]:
        narration_output, narration_mode = narrate_with_fallback(
            evaluation=evaluation, tone=tone
        )
        if narration_mode == "fallback":
            trace_id = evaluation.meta.trace_id
            log_event(
                logger,
                level=logging.WARNING,
                event_id="narration_fallback_used",
                message="Narration fallback was used; deterministic evaluation remains unchanged.",
                details={"trace_id": trace_id, "tone": tone or "default"},
                run_id=trace_id,
            )
        if evaluation.meta.trace_id:
            AuditService.record_narration(
                trace_id=evaluation.meta.trace_id,
                narration_output=narration_output,
                narration_mode=narration_mode,
                prompt_bundle_version=PROMPT_BUNDLE_VERSION,
            )
        return narration_output, narration_mode
