from __future__ import annotations

from datetime import datetime, timezone

from app.services.alert_evaluator import AlertEvaluator


def _ranked(job_id: str, score: int) -> list[dict]:
    return [
        {
            "job": {"id": job_id, "title": "Analyst"},
            "score": {"final_score": score, "reasons": [{"code": "GRADE_MATCH"}]},
        }
    ]


def test_alert_evaluator_is_deterministic_for_same_state(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "alert_eval_det.db"))
    rule = {"id": "rule-1", "min_score_threshold": 60, "max_per_day": 5, "cooldown_hours": 0}
    now = datetime(2026, 2, 14, 0, 0, tzinfo=timezone.utc)

    first = AlertEvaluator.evaluate_rule(alert_rule=rule, ranked_results=_ranked("J1", 75), now=now)
    second = AlertEvaluator.evaluate_rule(alert_rule=rule, ranked_results=_ranked("J1", 75), now=now)

    assert [d.model_dump(mode="json") for d in first] == [d.model_dump(mode="json") for d in second]


def test_alert_evaluator_suppresses_already_notified(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "alert_eval_notified.db"))
    monkeypatch.setattr("app.db.repo.alert_delivery_log_repo.AlertDeliveryLogRepo.is_job_notified", lambda *a, **k: True)
    monkeypatch.setattr(
        "app.db.repo.alert_delivery_log_repo.AlertDeliveryLogRepo.count_notified_since", lambda *a, **k: 0
    )
    monkeypatch.setattr(
        "app.db.repo.alert_delivery_log_repo.AlertDeliveryLogRepo.is_cooldown_active", lambda *a, **k: False
    )

    decisions = AlertEvaluator.evaluate_rule(
        alert_rule={"id": "rule-1", "min_score_threshold": 50, "max_per_day": 5, "cooldown_hours": 24},
        ranked_results=_ranked("J1", 80),
        now=datetime(2026, 2, 14, 1, 0, tzinfo=timezone.utc),
    )
    assert decisions[0].triggered is False
    assert decisions[0].suppression_reason == "ALREADY_NOTIFIED"
