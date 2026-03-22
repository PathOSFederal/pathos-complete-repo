from datetime import datetime, timezone

from fastapi import APIRouter

from app.contracts.desktop_contract import BackendInfo, PingResponse
from app.core.config import (
    get_alert_global_rules_per_run,
    get_alert_rule_min_interval_minutes,
    get_alert_run_lock_ttl_seconds,
    get_alert_run_max_jobs_scanned,
    get_api_keys,
    get_base_url,
    get_runtime_env,
)
from app.models.alert_digest import AlertDigestOut, DesktopLatestDigestOut, DesktopOverviewOut, GuardrailConfigOut
from app.models.alert_rule import AlertRuleOut
from app.models.saved_search import SavedSearchOut
from app.services.alert_digest_service import AlertDigestService
from app.services.alert_rule_service import AlertRuleService
from app.services.alerts_run_service import AlertsRunService
from app.services.saved_search_service import SavedSearchService

router = APIRouter()


@router.get("/desktop/info", response_model=BackendInfo)
def get_desktop_info() -> BackendInfo:
    return BackendInfo(
        version="0.1.0",
        env=get_runtime_env(),
        authRequired=bool(get_api_keys()),
        baseUrl=get_base_url(),
        serverTime=datetime.now(timezone.utc),
    )


@router.get("/desktop/ping", response_model=PingResponse)
def desktop_ping() -> PingResponse:
    return PingResponse(status="ok")


@router.get("/desktop/alerts/digests", response_model=list[AlertDigestOut])
def desktop_list_alert_digests(limit: int = 50) -> list[AlertDigestOut]:
    bounded = max(1, min(limit, 500))
    return AlertDigestService.list_recent(limit=bounded)


@router.get("/desktop/digests/latest", response_model=list[DesktopLatestDigestOut])
def desktop_list_latest_digests(limit: int = 50) -> list[DesktopLatestDigestOut]:
    bounded = max(1, min(limit, 500))
    return AlertDigestService.list_desktop_latest(limit=bounded)


@router.get("/desktop/saved-searches", response_model=list[SavedSearchOut])
def desktop_list_saved_searches() -> list[SavedSearchOut]:
    return SavedSearchService.list_all()


@router.get("/desktop/alert-rules", response_model=list[AlertRuleOut])
def desktop_list_alert_rules() -> list[AlertRuleOut]:
    return AlertRuleService.list_all()


@router.get("/desktop/overview", response_model=DesktopOverviewOut)
def desktop_overview(limit: int = 10) -> DesktopOverviewOut:
    bounded = max(1, min(limit, 100))
    return DesktopOverviewOut(
        latest_digests=AlertDigestService.list_recent(limit=bounded),
        latest_digest_summaries=AlertDigestService.list_desktop_latest(limit=bounded),
        saved_searches=SavedSearchService.list_all(),
        alert_rules=AlertRuleService.list_all(),
        last_alert_run=AlertsRunService.get_latest_run(),
        guardrail_config=GuardrailConfigOut(
            min_interval_minutes=get_alert_rule_min_interval_minutes(),
            max_jobs_scanned=get_alert_run_max_jobs_scanned(),
            global_rules_per_run=get_alert_global_rules_per_run(),
            lock_ttl_seconds=get_alert_run_lock_ttl_seconds(),
        ),
    )
