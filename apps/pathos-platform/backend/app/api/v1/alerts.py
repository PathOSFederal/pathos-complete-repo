"""app.api.v1.alerts

WHY THIS FILE EXISTS:
Thin API controller for saved-search run execution and alert retrieval/acknowledge.

LAYER FIT:
- Router/controller layer.

WHAT THIS FILE MUST NOT DO:
- Must not compute new-job diffs directly.
"""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, HTTPException, Query, Request

from app.models.alert_digest import AlertDigestOut, AlertMetricsOut, AlertRuleHistoryOut, AlertRunsOut
from app.models.alerts import AlertAcknowledgeResponse, AlertOut, SavedSearchRunOut
from app.models.alert_rule import AlertRunSummary
from app.models.alert_rule import AlertRuleCreateRequest, AlertRuleOut, AlertRuleUpdateRequest
from app.core.request_context import set_saved_search_id
from app.services.alert_digest_service import AlertDigestService
from app.services.alerts_run_service import AlertsRunService
from app.services.alert_rule_service import AlertRuleNotFoundError, AlertRuleService, AlertRuleValidationError
from app.services.alert_service import AlertNotFoundError, AlertService
from app.services.job_search_service import (
    JobSearchConfigError,
    JobSearchRateLimitedError,
    JobSearchUpstreamAuthError,
    JobSearchUpstreamSchemaError,
    JobSearchUpstreamUnavailableError,
)
from app.services.saved_search_service import SavedSearchNotFoundError

router = APIRouter()


@router.post("/alerts/run", response_model=AlertRunSummary)
def run_alerts(request: Request) -> AlertRunSummary:
    """Evaluate all enabled alert rules in deterministic order."""

    request_id = getattr(request.state, "request_id", "missing-request-id")
    summary = AlertsRunService.run_enabled_rules(request_id=request_id)
    request.state.run_id = summary.run_id
    request.state.domain_outcome = summary.domain_outcome.value
    if summary.skip_reason:
        request.state.skip_reason = summary.skip_reason.value
    if summary.empty_reason:
        request.state.empty_reason = summary.empty_reason.value
    return summary


@router.get("/alerts/runs", response_model=list[AlertRunsOut])
def list_alert_runs(limit: int = Query(default=50, ge=1, le=500)) -> list[AlertRunsOut]:
    return AlertsRunService.list_runs(limit=limit)


@router.get("/alerts/rules/{alert_rule_id}/history", response_model=list[AlertRuleHistoryOut])
def list_alert_rule_history(alert_rule_id: str, limit: int = Query(default=50, ge=1, le=500)) -> list[AlertRuleHistoryOut]:
    return AlertsRunService.list_rule_history(alert_rule_id=alert_rule_id, limit=limit)


@router.get("/alerts/metrics/recent", response_model=list[AlertMetricsOut])
def list_alert_metrics_recent(limit: int = Query(default=50, ge=1, le=500)) -> list[AlertMetricsOut]:
    return AlertsRunService.list_recent_metrics(limit=limit)


@router.get("/alerts/digests", response_model=list[AlertDigestOut])
def list_alert_digests(limit: int = Query(default=50, ge=1, le=500)) -> list[AlertDigestOut]:
    return AlertDigestService.list_recent(limit=limit)


@router.delete("/alerts/digests/purge")
def purge_old_digests(days: int = Query(default=30, ge=1, le=3650)) -> dict:
    deleted = AlertDigestService.purge_older_than(days=days)
    return {"deleted": deleted, "older_than_days": days}


@router.post("/alerts/digests/retain")
def retain_last_n_digests(keep_n: int = Query(default=50, ge=1, le=5000)) -> dict:
    deleted = AlertDigestService.keep_last_n_per_rule(keep_n=keep_n)
    return {"deleted": deleted, "keep_n": keep_n}


@router.delete("/alerts/rules/{alert_rule_id}/logs")
def purge_rule_logs(alert_rule_id: str) -> dict:
    return AlertDigestService.purge_for_rule(alert_rule_id=alert_rule_id)


@router.delete("/alerts/runs/purge")
def purge_old_runs(days: int = Query(default=30, ge=1, le=3650)) -> dict:
    deleted = AlertDigestService.purge_global_runs_older_than(days=days)
    return {"deleted": deleted, "older_than_days": days, "at": datetime.utcnow().isoformat()}


@router.post("/alert-rules", response_model=AlertRuleOut)
def create_alert_rule(payload: AlertRuleCreateRequest) -> AlertRuleOut:
    try:
        return AlertRuleService.create(payload)
    except AlertRuleValidationError as exc:
        raise HTTPException(status_code=400, detail={"code": "BAD_REQUEST"}) from exc


@router.post("/alerts/rules", response_model=AlertRuleOut)
def create_alert_rule_plural(payload: AlertRuleCreateRequest) -> AlertRuleOut:
    """Compatibility route for clients expecting plural alerts/rules path."""

    return create_alert_rule(payload)


@router.get("/alert-rules", response_model=list[AlertRuleOut])
def list_alert_rules() -> list[AlertRuleOut]:
    return AlertRuleService.list_all()


@router.get("/alerts/rules", response_model=list[AlertRuleOut])
def list_alert_rules_plural() -> list[AlertRuleOut]:
    """Compatibility route for clients expecting plural alerts/rules path."""

    return list_alert_rules()


@router.get("/alert-rules/{alert_rule_id}", response_model=AlertRuleOut)
def get_alert_rule(alert_rule_id: str) -> AlertRuleOut:
    try:
        return AlertRuleService.get(alert_rule_id)
    except AlertRuleNotFoundError as exc:
        raise HTTPException(status_code=404, detail={"code": "ALERT_RULE_NOT_FOUND"}) from exc


@router.put("/alert-rules/{alert_rule_id}", response_model=AlertRuleOut)
def update_alert_rule(alert_rule_id: str, payload: AlertRuleUpdateRequest) -> AlertRuleOut:
    try:
        return AlertRuleService.update(alert_rule_id, payload)
    except AlertRuleNotFoundError as exc:
        raise HTTPException(status_code=404, detail={"code": "ALERT_RULE_NOT_FOUND"}) from exc


@router.delete("/alert-rules/{alert_rule_id}")
def delete_alert_rule(alert_rule_id: str) -> dict:
    try:
        AlertRuleService.delete(alert_rule_id)
    except AlertRuleNotFoundError as exc:
        raise HTTPException(status_code=404, detail={"code": "ALERT_RULE_NOT_FOUND"}) from exc
    return {"deleted": True, "id": alert_rule_id}


@router.post("/saved-searches/{saved_search_id}/run", response_model=SavedSearchRunOut)
def run_saved_search(saved_search_id: str, request: Request) -> SavedSearchRunOut:
    """Execute saved search and create derived alert when new IDs appear."""

    normalized_saved_search_id = saved_search_id.strip()
    set_saved_search_id(normalized_saved_search_id)
    request.state.saved_search_id = normalized_saved_search_id
    request_id = getattr(request.state, "request_id", "missing-request-id")
    try:
        result = AlertService.run_saved_search(saved_search_id=normalized_saved_search_id, request_id=request_id)
        request.state.domain_outcome = result.domain_outcome.value
        if result.skip_reason:
            request.state.skip_reason = result.skip_reason.value
        if result.empty_reason:
            request.state.empty_reason = result.empty_reason.value
        return result
    except SavedSearchNotFoundError as exc:
        raise HTTPException(status_code=404, detail={"code": "SAVED_SEARCH_NOT_FOUND"}) from exc
    except JobSearchConfigError as exc:
        raise HTTPException(status_code=503, detail={"code": "SERVICE_UNAVAILABLE"}) from exc
    except JobSearchUpstreamAuthError as exc:
        raise HTTPException(status_code=502, detail={"code": "UPSTREAM_BAD_RESPONSE"}) from exc
    except JobSearchUpstreamSchemaError as exc:
        raise HTTPException(status_code=502, detail={"code": "UPSTREAM_BAD_RESPONSE"}) from exc
    except JobSearchUpstreamUnavailableError as exc:
        raise HTTPException(status_code=503, detail={"code": "SERVICE_UNAVAILABLE"}) from exc
    except JobSearchRateLimitedError as exc:
        raise HTTPException(status_code=429, detail={"code": "RATE_LIMITED"}) from exc


@router.get("/alerts", response_model=list[AlertOut])
def list_alerts(limit: int = Query(default=100, ge=1, le=500)) -> list[AlertOut]:
    """List alerts in deterministic created_at descending order."""

    return AlertService.list_alerts(limit=limit)


@router.get("/alerts/{alert_id}", response_model=AlertOut)
def get_alert(alert_id: str) -> AlertOut:
    """Fetch one alert by id."""

    try:
        return AlertService.get_alert(alert_id)
    except AlertNotFoundError as exc:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND"}) from exc


@router.post("/alerts/{alert_id}/ack", response_model=AlertAcknowledgeResponse)
def ack_alert(alert_id: str) -> AlertAcknowledgeResponse:
    """Acknowledge one alert and return updated value."""

    try:
        alert = AlertService.acknowledge(alert_id)
    except AlertNotFoundError as exc:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND"}) from exc
    return AlertAcknowledgeResponse(acknowledged=True, alert=alert)
