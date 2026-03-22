"""Deterministic threshold/cooldown/max-per-day alert evaluator."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from app.db.repo.alert_delivery_log_repo import AlertDeliveryLogRepo
from app.models.alert_rule import AlertDecision


class AlertEvaluator:
    @staticmethod
    def evaluate_rule(
        *,
        alert_rule: dict[str, Any],
        ranked_results: list[dict[str, Any]],
        now: datetime,
    ) -> list[AlertDecision]:
        rule_id = str(alert_rule["id"])
        threshold = int(alert_rule["min_score_threshold"])
        max_per_day = int(alert_rule["max_per_day"])
        cooldown_hours = int(alert_rule["cooldown_hours"])

        day_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc).isoformat()
        notified_today = AlertDeliveryLogRepo.count_notified_since(rule_id, day_start)
        cooldown_cutoff = (now - timedelta(hours=cooldown_hours)).isoformat()
        cooldown_active = cooldown_hours > 0 and AlertDeliveryLogRepo.is_cooldown_active(rule_id, cooldown_cutoff)

        decisions: list[AlertDecision] = []
        run_triggers = 0

        for row in ranked_results:
            score_block = row["score"]
            job_block = row["job"]
            job_id = str(job_block["id"])
            score = int(score_block["final_score"])
            reasons_summary = [entry["code"] for entry in score_block.get("reasons", [])]

            suppression_reason = None
            triggered = False
            if score < threshold:
                suppression_reason = "BELOW_THRESHOLD"
            elif AlertDeliveryLogRepo.is_job_notified(rule_id, job_id):
                suppression_reason = "ALREADY_NOTIFIED"
            elif cooldown_active:
                suppression_reason = "RULE_COOLDOWN_ACTIVE"
            elif (notified_today + run_triggers) >= max_per_day:
                suppression_reason = "MAX_PER_DAY_REACHED"
            else:
                triggered = True
                run_triggers += 1

            decisions.append(
                AlertDecision(
                    job_id=job_id,
                    score=score,
                    reasons_summary=reasons_summary,
                    triggered=triggered,
                    suppression_reason=suppression_reason,
                )
            )

        return decisions
