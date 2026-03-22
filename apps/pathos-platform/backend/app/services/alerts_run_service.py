"""Manual/background alert run orchestration with deterministic behavior."""

from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Any
from typing import Callable
from typing import Literal
from uuid import uuid4

from app.core.config import (
    get_alert_global_rules_per_run,
    get_alert_run_lock_ttl_seconds,
    get_alert_rule_min_interval_minutes,
    get_alert_run_max_jobs_scanned,
)
from app.core.logging import log_event
from app.core.request_context import (
    set_request_id,
    set_rule_id,
    set_run_id,
    set_saved_search_id,
)
from app.db.repo.alert_delivery_log_repo import AlertDeliveryLogRepo
from app.db.repo.alert_repo import AlertRepo
from app.db.repo.alert_rule_repo import AlertRuleRepo
from app.db.repo.alert_rule_run_repo import AlertRuleRunRepo
from app.db.repo.alert_run_repo import AlertRunRepo
from app.db.repo.alert_scheduler_lock_repo import AlertSchedulerLockRepo
from app.models.alert_digest import (
    AlertMetricsOut,
    AlertRuleHistoryOut,
    AlertRunsOut,
    DeliveryIntent,
)
from app.models.alert_rule import AlertRunRuleBreakdown, AlertRunSummary
from app.models.outcome import BackoffEvent, DomainOutcome, EmptyReason, SkipReason
from app.services.alert_evaluator import AlertEvaluator
from app.services.delta_engine_service import DeltaEngineService
from app.services.delivery_transport_service import (
    EmailDigestFutureTransport,
    LocalDigestTransport,
)
from app.services.digest_builder_service import DigestBuilderService
from app.services.job_search_service import (
    JobSearchService,
    JobSearchRateLimitedError,
    JobSearchUpstreamUnavailableError,
)
from app.services.saved_search_runner_service import SavedSearchRunnerService
from app.services.saved_search_checkpoint_service import SavedSearchCheckpointService
from app.core.worker_retry_policy import WorkerRetryPolicy, default_worker_retry_policy

logger = logging.getLogger("pathos.alerts")


class AlertsRunService:
    LOCK_NAME = "alerts.run.enabled_rules"

    @staticmethod
    def _run_with_backoff(
        *,
        fn: Callable[[], dict],
        retry_policy: WorkerRetryPolicy | None = None,
        max_attempts: int | None = None,
        base_backoff_seconds: float | None = None,
        sleep_fn: Callable[[float], None] = time.sleep,
    ) -> tuple[dict, list[dict[str, str | None]]]:
        policy = retry_policy or default_worker_retry_policy()
        if max_attempts is not None or base_backoff_seconds is not None:
            policy = WorkerRetryPolicy(
                max_attempts=max_attempts
                if max_attempts is not None
                else policy.max_attempts,
                base_backoff_seconds=base_backoff_seconds
                if base_backoff_seconds is not None
                else policy.base_backoff_seconds,
                max_backoff_seconds=policy.max_backoff_seconds,
            )
        attempt = 0
        backoff_events: list[dict[str, str | None]] = []
        while True:
            attempt += 1
            try:
                return fn(), backoff_events
            except (JobSearchRateLimitedError, JobSearchUpstreamUnavailableError):
                if attempt >= policy.max_attempts:
                    raise
                delay = policy.backoff_seconds_for_attempt(attempt)
                backoff_events.append(
                    {
                        "code": "BACKOFF",
                        "message": "Retry delay applied after upstream throttling or unavailability.",
                        "detail": f"delay_seconds={delay:g}",
                    }
                )
                sleep_fn(delay)

    @staticmethod
    def _normalize_skip_reason(raw_value: object) -> SkipReason | None:
        if raw_value is None:
            return None
        value = str(raw_value).strip().upper()
        if not value:
            return None
        try:
            return SkipReason(value)
        except ValueError:
            return SkipReason.UNKNOWN

    @staticmethod
    def _normalize_backoff_events(raw_value: object) -> list[BackoffEvent]:
        if not isinstance(raw_value, list):
            return []
        output: list[BackoffEvent] = []
        for item in raw_value:
            if isinstance(item, int):
                output.append(
                    BackoffEvent(
                        code="BACKOFF",
                        message="Retry delay applied after upstream throttling or unavailability.",
                        detail=f"delay_seconds={item}",
                    )
                )
                continue
            if isinstance(item, dict):
                code = str(item.get("code", "")).strip() or "UNKNOWN"
                message = (
                    str(item.get("message", "")).strip() or "Backoff event recorded."
                )
                detail_value = item.get("detail")
                detail = str(detail_value) if detail_value is not None else None
                output.append(BackoffEvent(code=code, message=message, detail=detail))
                continue
            output.append(
                BackoffEvent(
                    code="UNKNOWN", message="Backoff event recorded.", detail=str(item)
                )
            )
        return output

    @staticmethod
    def _derive_domain_outcome(
        *,
        status: str,
        skip_reason: SkipReason | None,
        jobs_scanned: int,
        error_summary: str | None,
    ) -> DomainOutcome:
        if skip_reason is not None:
            return DomainOutcome.SKIPPED
        if status in {"failed", "partial_failure"} or (error_summary or "").strip():
            return DomainOutcome.ERROR
        if jobs_scanned == 0:
            return DomainOutcome.EMPTY
        return DomainOutcome.SUCCESS

    @staticmethod
    def _derive_empty_reason(
        *, domain_outcome: DomainOutcome, jobs_scanned: int
    ) -> EmptyReason | None:
        if domain_outcome is not DomainOutcome.EMPTY:
            return None
        if jobs_scanned == 0:
            return EmptyReason.UNKNOWN
        return None

    @staticmethod
    def _pick_transport(
        delivery_mode: str,
    ) -> LocalDigestTransport | EmailDigestFutureTransport:
        if delivery_mode == "email_digest_future":
            return EmailDigestFutureTransport()
        return LocalDigestTransport()

    @staticmethod
    def _to_millis(start: float) -> int:
        return int((time.monotonic() - start) * 1000)

    @staticmethod
    def run_enabled_rules(
        *,
        request_id: str,
        sleep_fn: Callable[[float], None] = time.sleep,
        max_run_seconds: int | None = None,
        max_jobs_scanned: int | None = None,
        max_rules_evaluated: int | None = None,
        retry_policy: WorkerRetryPolicy | None = None,
        evaluation_enabled: bool = True,
        delivery_enabled: bool = True,
        dry_run_mode: bool = False,
    ) -> AlertRunSummary:
        set_request_id(request_id)
        started_at_dt = datetime.now(timezone.utc)
        run_monotonic_started = time.monotonic()
        started_at = started_at_dt.isoformat()
        run_id = str(uuid4())
        policy = retry_policy or default_worker_retry_policy()
        run_time_budget = max(1, int(max_run_seconds or 0))
        if max_run_seconds is None:
            run_time_budget = 24 * 60 * 60
        run_jobs_budget = max(1, int(max_jobs_scanned or 0))
        if max_jobs_scanned is None:
            run_jobs_budget = get_alert_run_max_jobs_scanned()
        run_rules_budget = max(1, int(max_rules_evaluated or 0))
        if max_rules_evaluated is None:
            run_rules_budget = get_alert_global_rules_per_run()
        run_backoff_events: list[dict[str, str | None]] = []
        set_run_id(run_id)
        skip_reason: SkipReason | None = None
        skip_details: str | None = None
        metrics = {
            "usajobs_fetch_ms": 0,
            "normalize_ms": 0,
            "score_ms": 0,
            "delta_ms": 0,
            "digest_ms": 0,
        }
        lock_acquired = False
        lock_released = False
        AlertRunRepo.create(
            {
                "id": run_id,
                "started_at": started_at,
                "ended_at": None,
                "status": "running",
                "rules_evaluated": 0,
                "jobs_scanned": 0,
                "triggers_count": 0,
                "suppressed_count": 0,
                "error_summary": None,
                "usajobs_fetch_ms": metrics["usajobs_fetch_ms"],
                "normalize_ms": metrics["normalize_ms"],
                "score_ms": metrics["score_ms"],
                "delta_ms": metrics["delta_ms"],
                "digest_ms": metrics["digest_ms"],
                "backoff_events_json": json.dumps(run_backoff_events, sort_keys=True),
                "lock_acquired": lock_acquired,
                "lock_released": lock_released,
                "skip_reason": skip_reason,
                "skip_details": skip_details,
            }
        )

        per_rule: list[AlertRunRuleBreakdown] = []
        rules_evaluated = 0
        jobs_scanned = 0
        triggers_count = 0
        suppressed_count = 0
        errors: list[str] = []
        status: Literal["success", "partial_failure", "failed"] = "success"
        quarantined_rule_ids: set[str] = set()

        lock_acquired_at = datetime.now(timezone.utc)
        lock_expires_at = lock_acquired_at + timedelta(
            seconds=get_alert_run_lock_ttl_seconds()
        )
        lock_acquired = AlertSchedulerLockRepo.try_acquire(
            lock_name=AlertsRunService.LOCK_NAME,
            owner_run_id=run_id,
            acquired_at=lock_acquired_at.isoformat(),
            expires_at=lock_expires_at.isoformat(),
        )

        if not lock_acquired:
            log_event(
                logger,
                level=logging.WARNING,
                event_id="worker_lock_acquired",
                message="Worker scheduler lock acquisition attempt failed.",
                details={
                    "lock_name": AlertsRunService.LOCK_NAME,
                    "lock_acquired": False,
                },
                request_id=request_id,
                run_id=run_id,
                worker_run_id=run_id,
            )
            status = "failed"
            errors.append("LOCK_NOT_ACQUIRED")
            skip_reason = SkipReason.LOCKED
            skip_details = "Alert run skipped because another run currently owns the scheduler lock."
            log_event(
                logger,
                level=logging.WARNING,
                event_id="alert_run_lock_not_acquired",
                message="The alert run did not start because another run holds the scheduler lock. Wait for the active run to finish, then retry.",
                details={"lock_name": AlertsRunService.LOCK_NAME},
                request_id=request_id,
                run_id=run_id,
            )
            log_event(
                logger,
                level=logging.INFO,
                event_id="alert_run_skipped",
                message="The alert run was skipped before scanning because lock acquisition failed.",
                details={
                    "outcome": "skipped",
                    "skip_reason": skip_reason.value,
                    "skip_details": skip_details,
                    "duration_ms": 0,
                },
                request_id=request_id,
                run_id=run_id,
            )
        else:
            log_event(
                logger,
                level=logging.INFO,
                event_id="worker_lock_acquired",
                message="Worker scheduler lock acquired.",
                details={
                    "lock_name": AlertsRunService.LOCK_NAME,
                    "lock_acquired": True,
                },
                request_id=request_id,
                run_id=run_id,
                worker_run_id=run_id,
            )
            log_event(
                logger,
                level=logging.INFO,
                event_id="alert_run_started",
                message="The alert run started with deterministic guardrails. The service will process enabled rules in stable order.",
                details={},
                request_id=request_id,
                run_id=run_id,
            )
            try:
                if not evaluation_enabled:
                    skip_reason = SkipReason.DISABLED
                    skip_details = (
                        "Alert run skipped because alerts evaluation is disabled."
                    )
                    log_event(
                        logger,
                        level=logging.WARNING,
                        event_id="alert_run_skipped",
                        message="Alert run skipped because alerts evaluation is disabled by operational flag.",
                        details={
                            "outcome": "skipped",
                            "skip_reason": skip_reason.value,
                            "skip_details": skip_details,
                        },
                        request_id=request_id,
                        run_id=run_id,
                    )
                    rules: list[dict[str, Any]] = []
                else:
                    rules = AlertRuleRepo.list_enabled()
                if dry_run_mode:
                    log_event(
                        logger,
                        level=logging.INFO,
                        event_id="dry_run_enabled",
                        message="Dry-run mode enabled. Alert evaluation will run without delivery side effects.",
                        details={"dry_run_mode": True},
                        request_id=request_id,
                        run_id=run_id,
                    )
                if not delivery_enabled:
                    log_event(
                        logger,
                        level=logging.WARNING,
                        event_id="delivery_disabled",
                        message="Alert delivery side effects are disabled by operational flag.",
                        details={"alerts_delivery_enabled": False},
                        request_id=request_id,
                        run_id=run_id,
                    )
                side_effects_enabled = delivery_enabled and not dry_run_mode
                global_rule_cap = min(
                    get_alert_global_rules_per_run(), run_rules_budget
                )
                if len(rules) > global_rule_cap:
                    errors.append("BUDGET_MAX_RULES_EVALUATED")
                    log_event(
                        logger,
                        level=logging.WARNING,
                        event_id="budget_exceeded",
                        message="Worker run rule set trimmed to max_rules_evaluated budget.",
                        details={
                            "budget_name": "max_rules_evaluated",
                            "budget_limit": global_rule_cap,
                            "requested_rules": len(rules),
                        },
                        request_id=request_id,
                        run_id=run_id,
                    )
                    rules = rules[:global_rule_cap]
                if not rules:
                    skip_reason = SkipReason.DISABLED
                    skip_details = "Alert run skipped because no enabled alert rules are configured."
                    log_event(
                        logger,
                        level=logging.INFO,
                        event_id="alert_run_skipped",
                        message="The alert run completed without scanning because no enabled alert rules are configured.",
                        details={
                            "outcome": "skipped",
                            "skip_reason": skip_reason.value,
                            "skip_details": skip_details,
                            "duration_ms": 0,
                        },
                        request_id=request_id,
                        run_id=run_id,
                    )
                if not JobSearchService.usajobs_configured():
                    env_presence = JobSearchService.usajobs_log_env_presence()
                    skip_reason = SkipReason.USJOBS_NOT_CONFIGURED
                    skip_details = "USAJOBS fetch skipped (missing env)."
                    run_backoff_events.append(
                        {
                            "code": "USJOBS_NOT_CONFIGURED",
                            "message": "USAJOBS fetch skipped (missing env).",
                        }
                    )
                    rules_evaluated = len(rules)
                    for rule in rules:
                        per_rule.append(
                            AlertRunRuleBreakdown(
                                alert_rule_id=str(rule["id"]),
                                saved_search_id=str(rule["saved_search_id"]),
                                jobs_scanned=0,
                                triggers_count=0,
                                suppressed_count=0,
                            )
                        )
                    log_event(
                        logger,
                        level=logging.INFO,
                        event_id="usajobs_config_missing",
                        message="Alert run skipped scanning because required USAJOBS environment variables are missing.",
                        details={
                            "outcome": "skipped",
                            "duration_ms": 0,
                            "env_presence": env_presence,
                        },
                        request_id=request_id,
                        run_id=run_id,
                    )
                    log_event(
                        logger,
                        level=logging.INFO,
                        event_id="alert_run_skipped",
                        message="The alert run completed without scanning because USAJOBS is not configured.",
                        details={
                            "outcome": "skipped",
                            "skip_reason": skip_reason.value,
                            "skip_details": skip_details,
                            "duration_ms": 0,
                            "env_presence": env_presence,
                        },
                        request_id=request_id,
                        run_id=run_id,
                    )
                    # Teaching note:
                    # We keep run status successful to avoid a false "failure" alarm,
                    # while still making skipped scanning explicit in response fields.
                    rules = []
                min_interval_minutes = get_alert_rule_min_interval_minutes()
                max_jobs_per_run = min(
                    get_alert_run_max_jobs_scanned(), run_jobs_budget
                )
                remaining_jobs = max_jobs_per_run

                now = datetime.now(timezone.utc)
                for rule in rules:
                    elapsed_seconds = int(time.monotonic() - run_monotonic_started)
                    if elapsed_seconds >= run_time_budget:
                        errors.append("BUDGET_MAX_RUN_SECONDS")
                        log_event(
                            logger,
                            level=logging.WARNING,
                            event_id="budget_exceeded",
                            message="Worker run stopped after reaching max_run_seconds budget.",
                            details={
                                "budget_name": "max_run_seconds",
                                "budget_limit": run_time_budget,
                                "elapsed_seconds": elapsed_seconds,
                            },
                            request_id=request_id,
                            run_id=run_id,
                        )
                        break
                    if jobs_scanned >= max_jobs_per_run:
                        errors.append("BUDGET_MAX_JOBS_SCANNED")
                        log_event(
                            logger,
                            level=logging.WARNING,
                            event_id="budget_exceeded",
                            message="Worker run stopped after reaching max_jobs_scanned budget.",
                            details={
                                "budget_name": "max_jobs_scanned",
                                "budget_limit": max_jobs_per_run,
                                "jobs_scanned": jobs_scanned,
                            },
                            request_id=request_id,
                            run_id=run_id,
                        )
                        break
                    if rules_evaluated >= run_rules_budget:
                        errors.append("BUDGET_MAX_RULES_EVALUATED")
                        log_event(
                            logger,
                            level=logging.WARNING,
                            event_id="budget_exceeded",
                            message="Worker run stopped after reaching max_rules_evaluated budget.",
                            details={
                                "budget_name": "max_rules_evaluated",
                                "budget_limit": run_rules_budget,
                                "rules_evaluated": rules_evaluated,
                            },
                            request_id=request_id,
                            run_id=run_id,
                        )
                        break

                    rule_run_id = str(uuid4())
                    set_rule_id(str(rule["id"]))
                    saved_search_id = str(rule["saved_search_id"])
                    set_saved_search_id(saved_search_id)
                    rules_evaluated += 1
                    rule_started_at = datetime.now(timezone.utc).isoformat()
                    resume_cursor = (
                        SavedSearchCheckpointService.determine_resume_cursor(
                            saved_search_id=saved_search_id
                        )
                    )
                    latest_rule_run = AlertRuleRunRepo.get_latest_for_rule(
                        str(rule["id"])
                    )
                    if latest_rule_run is not None:
                        cutoff = datetime.now(timezone.utc) - timedelta(
                            minutes=min_interval_minutes
                        )
                        if (
                            datetime.fromisoformat(str(latest_rule_run["started_at"]))
                            > cutoff
                        ):
                            per_rule.append(
                                AlertRunRuleBreakdown(
                                    alert_rule_id=str(rule["id"]),
                                    saved_search_id=str(rule["saved_search_id"]),
                                    jobs_scanned=0,
                                    triggers_count=0,
                                    suppressed_count=1,
                                )
                            )
                            suppressed_count += 1
                            AlertRuleRunRepo.create(
                                {
                                    "id": rule_run_id,
                                    "alert_run_id": run_id,
                                    "alert_rule_id": str(rule["id"]),
                                    "started_at": rule_started_at,
                                    "ended_at": datetime.now(timezone.utc).isoformat(),
                                    "status": "skipped",
                                    "jobs_scanned": 0,
                                    "triggers_count": 0,
                                    "suppressed_count": 1,
                                    "error_summary": "MIN_INTERVAL_GUARD",
                                    "backoff_events_json": json.dumps(
                                        [], sort_keys=True
                                    ),
                                }
                            )
                            SavedSearchCheckpointService.record_outcome(
                                run_id=rule_run_id,
                                alert_run_id=run_id,
                                alert_rule_id=str(rule["id"]),
                                saved_search_id=saved_search_id,
                                status="skipped",
                                jobs_scanned=0,
                                triggers_count=0,
                                suppressed_count=1,
                                query_fingerprint=None,
                                cursor_used=resume_cursor,
                                error_summary="MIN_INTERVAL_GUARD",
                            )
                            continue

                    try:
                        run_output, backoff_events = AlertsRunService._run_with_backoff(
                            fn=lambda: SavedSearchRunnerService.run_saved_search(
                                saved_search_id,
                                request_id=request_id,
                                resume_cursor=resume_cursor,
                            ),
                            retry_policy=policy,
                            sleep_fn=sleep_fn,
                        )
                        run_backoff_events.extend(backoff_events)
                        timing_block = run_output.get("timings_ms", {})
                        metrics["usajobs_fetch_ms"] += int(
                            timing_block.get("usajobs_fetch_ms", 0)
                        )
                        metrics["normalize_ms"] += int(
                            timing_block.get("normalize_ms", 0)
                        )
                        metrics["score_ms"] += int(timing_block.get("score_ms", 0))

                        results = run_output["results"]
                        if remaining_jobs <= 0:
                            results = []
                        elif len(results) > remaining_jobs:
                            results = results[:remaining_jobs]
                        remaining_jobs = max(0, remaining_jobs - len(results))
                        decisions = AlertEvaluator.evaluate_rule(
                            alert_rule=rule, ranked_results=results, now=now
                        )

                        delta_start = time.monotonic()
                        delta_out = DeltaEngineService.classify_and_update_snapshots(
                            saved_search_id=str(rule["saved_search_id"]),
                            ranked_results=results,
                        )
                        metrics["delta_ms"] += AlertsRunService._to_millis(delta_start)
                        rule_triggers = 0
                        rule_suppressed = 0

                        seen_at_dt = datetime.now(timezone.utc)
                        seen_at = seen_at_dt.isoformat()
                        triggered_job_ids: list[str] = []
                        for decision in decisions:
                            if side_effects_enabled:
                                AlertDeliveryLogRepo.upsert_seen(
                                    record_id=str(uuid4()),
                                    alert_rule_id=str(rule["id"]),
                                    job_id=decision.job_id,
                                    seen_at=seen_at,
                                    score=decision.score,
                                )
                            if decision.triggered:
                                rule_triggers += 1
                                triggered_job_ids.append(decision.job_id)
                                if side_effects_enabled:
                                    AlertDeliveryLogRepo.mark_notified(
                                        alert_rule_id=str(rule["id"]),
                                        job_id=decision.job_id,
                                        notified_at=seen_at,
                                    )
                            else:
                                rule_suppressed += 1

                        if side_effects_enabled:
                            digest_start = time.monotonic()
                            digest_payload = DigestBuilderService.build_digest_payload(
                                run_metadata={
                                    "run_id": run_id,
                                    "ruleset_version": run_output.get(
                                        "ruleset_version"
                                    ),
                                    "mapper_version": run_output.get("mapper_version"),
                                    "computed_at": seen_at,
                                    "query_fingerprint": run_output.get(
                                        "query_fingerprint"
                                    ),
                                    "resume_strategy": run_output.get(
                                        "resume_cursor_used", {}
                                    ).get("strategy", "full_refresh"),
                                },
                                ranked_results=results,
                                decisions=[
                                    item.model_dump(mode="json") for item in decisions
                                ],
                                deltas=delta_out["deltas"],
                            )
                            transport = AlertsRunService._pick_transport(
                                str(rule["delivery_mode"])
                            )
                            intent = DeliveryIntent(
                                run_id=run_id,
                                alert_rule_id=str(rule["id"]),
                                saved_search_id=str(rule["saved_search_id"]),
                                delivery_mode=str(rule["delivery_mode"]),
                                created_at=seen_at_dt,
                                digest_payload=digest_payload,
                                triggered_job_ids=sorted(triggered_job_ids),
                            )
                            transport.deliver(intent)
                            metrics["digest_ms"] += AlertsRunService._to_millis(
                                digest_start
                            )

                            if triggered_job_ids:
                                AlertRepo.create(
                                    {
                                        "id": str(uuid4()),
                                        "saved_search_id": str(rule["saved_search_id"]),
                                        "created_at": seen_at,
                                        "title": f"Alert rule trigger for {rule['saved_search_id']}",
                                        "summary": f"{len(triggered_job_ids)} job(s) triggered",
                                        "job_ids_json": json.dumps(
                                            sorted(triggered_job_ids), sort_keys=True
                                        ),
                                        "acknowledged_at": None,
                                    }
                                )
                        log_event(
                            logger,
                            level=logging.INFO,
                            event_id="alert_rule_evaluated",
                            message="The rule evaluation completed with deterministic scoring and suppression logic. Review trigger and suppression counts for expected behavior.",
                            details={
                                "jobs_scanned": len(results),
                                "triggers_count": rule_triggers,
                                "suppressed_count": rule_suppressed,
                            },
                            request_id=request_id,
                            run_id=run_id,
                            rule_id=str(rule["id"]),
                            saved_search_id=saved_search_id,
                        )

                        jobs_scanned += len(results)
                        triggers_count += rule_triggers
                        suppressed_count += rule_suppressed
                        per_rule.append(
                            AlertRunRuleBreakdown(
                                alert_rule_id=str(rule["id"]),
                                saved_search_id=saved_search_id,
                                jobs_scanned=len(results),
                                triggers_count=rule_triggers,
                                suppressed_count=rule_suppressed,
                            )
                        )
                        AlertRuleRunRepo.create(
                            {
                                "id": rule_run_id,
                                "alert_run_id": run_id,
                                "alert_rule_id": str(rule["id"]),
                                "started_at": rule_started_at,
                                "ended_at": datetime.now(timezone.utc).isoformat(),
                                "status": "success",
                                "jobs_scanned": len(results),
                                "triggers_count": rule_triggers,
                                "suppressed_count": rule_suppressed,
                                "error_summary": None,
                                "backoff_events_json": json.dumps(
                                    backoff_events, sort_keys=True
                                ),
                            }
                        )
                        SavedSearchCheckpointService.record_outcome(
                            run_id=rule_run_id,
                            alert_run_id=run_id,
                            alert_rule_id=str(rule["id"]),
                            saved_search_id=saved_search_id,
                            status="success",
                            jobs_scanned=len(results),
                            triggers_count=rule_triggers,
                            suppressed_count=rule_suppressed,
                            query_fingerprint=run_output.get("query_fingerprint"),
                            cursor_used=resume_cursor,
                            error_summary=None,
                            completed_at=datetime.now(timezone.utc).isoformat(),
                        )
                    except Exception as exc:  # noqa: BLE001 - wrapped into run summary.
                        quarantined_rule_ids.add(str(rule["id"]))
                        errors.append(f"rule={rule['id']} error={type(exc).__name__}")
                        per_rule.append(
                            AlertRunRuleBreakdown(
                                alert_rule_id=str(rule["id"]),
                                saved_search_id=saved_search_id,
                                jobs_scanned=0,
                                triggers_count=0,
                                suppressed_count=0,
                            )
                        )
                        AlertRuleRunRepo.create(
                            {
                                "id": rule_run_id,
                                "alert_run_id": run_id,
                                "alert_rule_id": str(rule["id"]),
                                "started_at": rule_started_at,
                                "ended_at": datetime.now(timezone.utc).isoformat(),
                                "status": "failed",
                                "jobs_scanned": 0,
                                "triggers_count": 0,
                                "suppressed_count": 0,
                                "error_summary": type(exc).__name__,
                                "backoff_events_json": json.dumps([], sort_keys=True),
                            }
                        )
                        SavedSearchCheckpointService.record_outcome(
                            run_id=rule_run_id,
                            alert_run_id=run_id,
                            alert_rule_id=str(rule["id"]),
                            saved_search_id=saved_search_id,
                            status="failed",
                            jobs_scanned=0,
                            triggers_count=0,
                            suppressed_count=0,
                            query_fingerprint=None,
                            cursor_used=resume_cursor,
                            error_summary=type(exc).__name__,
                            completed_at=datetime.now(timezone.utc).isoformat(),
                        )
                        log_event(
                            logger,
                            level=logging.ERROR,
                            event_id="alert_rule_failed",
                            message="The rule evaluation failed and was recorded as a deterministic failure outcome. Inspect the exception type and rerun after correction.",
                            details={"exception_type": type(exc).__name__},
                            request_id=request_id,
                            run_id=run_id,
                            rule_id=str(rule["id"]),
                            saved_search_id=saved_search_id,
                        )
                        log_event(
                            logger,
                            level=logging.WARNING,
                            event_id="poison_pill_quarantined",
                            message="Rule marked quarantined for the remainder of the run after repeated failure paths.",
                            details={
                                "alert_rule_id": str(rule["id"]),
                                "quarantined_count": len(quarantined_rule_ids),
                            },
                            request_id=request_id,
                            run_id=run_id,
                            rule_id=str(rule["id"]),
                            saved_search_id=saved_search_id,
                        )
            finally:
                lock_released = AlertSchedulerLockRepo.release(
                    lock_name=AlertsRunService.LOCK_NAME, owner_run_id=run_id
                )
                log_event(
                    logger,
                    level=logging.INFO,
                    event_id="worker_lock_released",
                    message="Worker scheduler lock release attempted after run execution.",
                    details={
                        "lock_name": AlertsRunService.LOCK_NAME,
                        "lock_released": lock_released,
                    },
                    request_id=request_id,
                    run_id=run_id,
                    worker_run_id=run_id,
                )

        if not lock_acquired:
            status = "failed"
        elif errors and rules_evaluated == len(errors):
            status = "failed"
        elif errors:
            status = "partial_failure"
        elif jobs_scanned == 0 and suppressed_count > 0 and skip_reason is None:
            skip_reason = SkipReason.MIN_INTERVAL
            skip_details = "All eligible rules were skipped by min-interval guard."
            log_event(
                logger,
                level=logging.INFO,
                event_id="alert_run_skipped",
                message="The alert run completed without scanning because all rules were in min-interval guard.",
                details={
                    "outcome": "skipped",
                    "skip_reason": skip_reason.value,
                    "skip_details": skip_details,
                    "duration_ms": 0,
                },
                request_id=request_id,
                run_id=run_id,
            )

        ended_at_dt = datetime.now(timezone.utc)
        ended_at = ended_at_dt.isoformat()
        error_summary = "; ".join(errors) if errors else None
        domain_outcome = AlertsRunService._derive_domain_outcome(
            status=status,
            skip_reason=skip_reason,
            jobs_scanned=jobs_scanned,
            error_summary=error_summary,
        )
        empty_reason = AlertsRunService._derive_empty_reason(
            domain_outcome=domain_outcome,
            jobs_scanned=jobs_scanned,
        )
        AlertRunRepo.update(
            {
                "id": run_id,
                "ended_at": ended_at,
                "status": status,
                "rules_evaluated": rules_evaluated,
                "jobs_scanned": jobs_scanned,
                "triggers_count": triggers_count,
                "suppressed_count": suppressed_count,
                "error_summary": error_summary,
                "usajobs_fetch_ms": metrics["usajobs_fetch_ms"],
                "normalize_ms": metrics["normalize_ms"],
                "score_ms": metrics["score_ms"],
                "delta_ms": metrics["delta_ms"],
                "digest_ms": metrics["digest_ms"],
                "backoff_events_json": json.dumps(run_backoff_events, sort_keys=True),
                "lock_acquired": lock_acquired,
                "lock_released": lock_released,
                "skip_reason": skip_reason.value if skip_reason else None,
                "skip_details": skip_details,
            }
        )
        log_event(
            logger,
            level=logging.INFO,
            event_id="alert_run_finished",
            message="The alert run finished and persisted summary metrics. Use the run ID to inspect rule history and metrics endpoints.",
            details={
                "status": status,
                "rules_evaluated": rules_evaluated,
                "jobs_scanned": jobs_scanned,
                "triggers_count": triggers_count,
                "suppressed_count": suppressed_count,
                "skip_reason": skip_reason.value if skip_reason else None,
            },
            request_id=request_id,
            run_id=run_id,
        )
        set_rule_id(None)
        set_saved_search_id(None)
        set_run_id(None)

        return AlertRunSummary(
            run_id=run_id,
            started_at=started_at_dt,
            ended_at=ended_at_dt,
            status=status,
            rules_evaluated=rules_evaluated,
            jobs_scanned=jobs_scanned,
            triggers_count=triggers_count,
            suppressed_count=suppressed_count,
            per_rule=per_rule,
            domain_outcome=domain_outcome,
            error_summary=error_summary,
            skip_reason=skip_reason,
            empty_reason=empty_reason,
            skip_details=skip_details,
        )

    @staticmethod
    def list_runs(limit: int = 50) -> list[AlertRunsOut]:
        rows = AlertRunRepo.list_recent(limit=limit)
        output: list[AlertRunsOut] = []
        for row in rows:
            backoff_payload = row.get("backoff_events_json") or "[]"
            backoff_raw = (
                json.loads(backoff_payload) if isinstance(backoff_payload, str) else []
            )
            backoff_events = AlertsRunService._normalize_backoff_events(backoff_raw)
            skip_reason = AlertsRunService._normalize_skip_reason(
                row.get("skip_reason")
            )
            status = str(row["status"])
            jobs_scanned = int(row["jobs_scanned"])
            error_summary = row.get("error_summary")
            domain_outcome = AlertsRunService._derive_domain_outcome(
                status=status,
                skip_reason=skip_reason,
                jobs_scanned=jobs_scanned,
                error_summary=error_summary,
            )
            empty_reason = AlertsRunService._derive_empty_reason(
                domain_outcome=domain_outcome,
                jobs_scanned=jobs_scanned,
            )
            output.append(
                AlertRunsOut(
                    id=row["id"],
                    started_at=datetime.fromisoformat(row["started_at"]),
                    ended_at=datetime.fromisoformat(row["ended_at"])
                    if row.get("ended_at")
                    else None,
                    status=status,
                    rules_evaluated=int(row["rules_evaluated"]),
                    jobs_scanned=jobs_scanned,
                    triggers_count=int(row["triggers_count"]),
                    suppressed_count=int(row.get("suppressed_count", 0)),
                    domain_outcome=domain_outcome,
                    error_summary=error_summary,
                    usajobs_fetch_ms=int(row.get("usajobs_fetch_ms", 0)),
                    normalize_ms=int(row.get("normalize_ms", 0)),
                    score_ms=int(row.get("score_ms", 0)),
                    delta_ms=int(row.get("delta_ms", 0)),
                    digest_ms=int(row.get("digest_ms", 0)),
                    backoff_events=backoff_events,
                    lock_acquired=bool(int(row.get("lock_acquired", 0))),
                    lock_released=bool(int(row.get("lock_released", 0))),
                    skip_reason=skip_reason,
                    empty_reason=empty_reason,
                    skip_details=row.get("skip_details"),
                )
            )
        return output

    @staticmethod
    def list_recent_metrics(limit: int = 50) -> list[AlertMetricsOut]:
        runs = AlertsRunService.list_runs(limit=limit)
        return [
            AlertMetricsOut(
                run_id=run.id,
                started_at=run.started_at,
                status=run.status,
                usajobs_fetch_ms=run.usajobs_fetch_ms,
                normalize_ms=run.normalize_ms,
                score_ms=run.score_ms,
                delta_ms=run.delta_ms,
                digest_ms=run.digest_ms,
                jobs_scanned=run.jobs_scanned,
                triggers_count=run.triggers_count,
                suppressed_count=run.suppressed_count,
                domain_outcome=run.domain_outcome,
                backoff_events=run.backoff_events,
                skip_reason=run.skip_reason,
                empty_reason=run.empty_reason,
                skip_details=run.skip_details,
            )
            for run in runs
        ]

    @staticmethod
    def get_latest_run() -> AlertRunsOut | None:
        row = AlertRunRepo.get_latest()
        if row is None:
            return None
        payload: dict[str, Any] = dict(row)
        backoff_payload = payload.get("backoff_events_json") or "[]"
        backoff_raw = (
            json.loads(backoff_payload) if isinstance(backoff_payload, str) else []
        )
        backoff_events = AlertsRunService._normalize_backoff_events(backoff_raw)
        skip_reason = AlertsRunService._normalize_skip_reason(
            payload.get("skip_reason")
        )
        status = str(payload["status"])
        jobs_scanned = int(payload["jobs_scanned"])
        error_summary = payload.get("error_summary")
        domain_outcome = AlertsRunService._derive_domain_outcome(
            status=status,
            skip_reason=skip_reason,
            jobs_scanned=jobs_scanned,
            error_summary=error_summary,
        )
        empty_reason = AlertsRunService._derive_empty_reason(
            domain_outcome=domain_outcome,
            jobs_scanned=jobs_scanned,
        )
        return AlertRunsOut(
            id=payload["id"],
            started_at=datetime.fromisoformat(payload["started_at"]),
            ended_at=datetime.fromisoformat(payload["ended_at"])
            if payload.get("ended_at")
            else None,
            status=status,
            rules_evaluated=int(payload["rules_evaluated"]),
            jobs_scanned=jobs_scanned,
            triggers_count=int(payload["triggers_count"]),
            suppressed_count=int(payload.get("suppressed_count", 0)),
            domain_outcome=domain_outcome,
            error_summary=error_summary,
            usajobs_fetch_ms=int(payload.get("usajobs_fetch_ms", 0)),
            normalize_ms=int(payload.get("normalize_ms", 0)),
            score_ms=int(payload.get("score_ms", 0)),
            delta_ms=int(payload.get("delta_ms", 0)),
            digest_ms=int(payload.get("digest_ms", 0)),
            backoff_events=backoff_events,
            lock_acquired=bool(int(payload.get("lock_acquired", 0))),
            lock_released=bool(int(payload.get("lock_released", 0))),
            skip_reason=skip_reason,
            empty_reason=empty_reason,
            skip_details=payload.get("skip_details"),
        )

    @staticmethod
    def list_rule_history(
        alert_rule_id: str, limit: int = 50
    ) -> list[AlertRuleHistoryOut]:
        rows = AlertRuleRunRepo.list_by_rule(alert_rule_id=alert_rule_id, limit=limit)
        output: list[AlertRuleHistoryOut] = []
        for row in rows:
            backoff_events = AlertsRunService._normalize_backoff_events(
                json.loads(row["backoff_events_json"])
            )
            output.append(
                AlertRuleHistoryOut(
                    id=row["id"],
                    alert_run_id=row["alert_run_id"],
                    alert_rule_id=row["alert_rule_id"],
                    started_at=datetime.fromisoformat(row["started_at"]),
                    ended_at=datetime.fromisoformat(row["ended_at"]),
                    status=row["status"],
                    jobs_scanned=int(row["jobs_scanned"]),
                    triggers_count=int(row["triggers_count"]),
                    suppressed_count=int(row["suppressed_count"]),
                    error_summary=row.get("error_summary"),
                    backoff_events=backoff_events,
                )
            )
        return output
