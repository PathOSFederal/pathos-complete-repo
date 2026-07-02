from __future__ import annotations

import ast
import json
import logging
from datetime import datetime, timezone
from pathlib import Path

from fastapi.testclient import TestClient

from app.adapters.usajobs.client import USAJobsClient
from app.adapters.usajobs.types import USAJobsSearchResponse, UpstreamAuditSummary
from app.adapters.usajobs.errors import UpstreamUnavailableError
from app.core.event_ids import ALL_EVENT_IDS
from app.core.logging import configure_logging
from app.core.startup_validation import StartupValidationError, validate_startup_config
from app.db.migration_safety import MigrationSafetyError, MigrationSafetyResult
from app.db.repo.alert_scheduler_lock_repo import AlertSchedulerLockRepo
from app.main import create_app
from app.models.advisor import AdvisorInput
from app.models.alert_rule import AlertRuleCreateRequest, AlertRunSummary
from app.models.job_search import JobSearchRequest, JobSearchResponse
from app.models.outcome import DomainOutcome
from app.models.saved_search import SavedSearchCreateRequest
from app.services.alert_rule_service import AlertRuleService
from app.services.alerts_run_service import AlertsRunService
from app.services.advisor_service import AdvisorService
from app.services.narration_service import NarrationService
from app.services.retention_service import RetentionService
from app.services.saved_search_service import SavedSearchService
from app.services.export_service import ExportService
from app.services.telemetry_service import TelemetryService
from app.services.wipe_service import WipeService
from app.worker import run_alerts_once
from app.domain.jobs.canonical_models import (
    CanonicalCompensation,
    CanonicalJob,
    CanonicalSourceMetadata,
)
from usajobs_execution_helper import execution_from_response


def _make_search_response(job_ids: list[str]) -> JobSearchResponse:
    return JobSearchResponse(
        results=[
            CanonicalJob(
                id=job_id,
                title=f"Job {job_id}",
                organization="Agency",
                locations=["Remote"],
                compensation=CanonicalCompensation(grade_min=11, grade_max=12),
                open_date=None,
                close_date=None,
                apply_url="https://example.com",
                source=CanonicalSourceMetadata(
                    source="USAJOBS",
                    retrieved_at="2026-02-15T00:00:00+00:00",
                    mapper_version="usajobs-normalize-v1",
                ),
            )
            for job_id in job_ids
        ],
        total=len(job_ids),
        page=1,
        page_size=20,
        request_id="req-log-harness",
    )


def _parse_json_log_lines(raw_output: str) -> list[dict]:
    rows: list[dict] = []
    for line in raw_output.splitlines():
        payload = line.strip()
        if not payload.startswith("{") or not payload.endswith("}"):
            continue
        parsed = json.loads(payload)
        if isinstance(parsed, dict):
            rows.append(parsed)
    return rows


def _emit_usajobs_success(monkeypatch) -> None:
    class FakeResponse:
        status_code = 200

        @staticmethod
        def json() -> dict:
            return {"SearchResult": {"SearchResultItems": []}}

    class FakeClient:
        def __init__(self, timeout):  # noqa: ANN001
            del timeout

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):  # noqa: ANN001
            del exc_type, exc, tb
            return False

        @staticmethod
        def get(url, headers, params):  # noqa: ANN001
            del url, headers, params
            return FakeResponse()

    monkeypatch.setattr("httpx.Client", FakeClient)
    monkeypatch.setenv("USAJOBS_API_KEY", "x")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "test@example.com")
    client = USAJobsClient(timeout_seconds=1.0)
    client.search_jobs({"Keyword": "Analyst"})


def _mock_diagnostics_success(monkeypatch) -> None:
    def _fake_search(self, query_params):  # noqa: ANN001
        del self, query_params
        return USAJobsSearchResponse(
            payload={"SearchResult": {"SearchResultItems": []}},
            audit=UpstreamAuditSummary(
                endpoint="/api/search",
                query_hash="diag",
                status_code=200,
                latency_ms=3,
                result_count=0,
                error_class=None,
            ),
        )

    monkeypatch.setattr(
        "app.services.usajobs_diagnostics_service.USAJobsClient.search_jobs",
        _fake_search,
    )


def _mock_diagnostics_failure(monkeypatch) -> None:
    def _fake_search(self, query_params):  # noqa: ANN001
        del self, query_params
        raise UpstreamUnavailableError("down")

    monkeypatch.setattr(
        "app.services.usajobs_diagnostics_service.USAJobsClient.search_jobs",
        _fake_search,
    )


def test_static__all_log_event_calls_use_registered_event_ids() -> None:
    discovered: set[str] = set()
    for path in list(Path("app").rglob("*.py")) + list(Path("tests").rglob("*.py")):
        source = path.read_text(encoding="utf-8")
        module = ast.parse(source)
        for node in ast.walk(module):
            if not isinstance(node, ast.Call):
                continue
            if not isinstance(node.func, ast.Name) or node.func.id != "log_event":
                continue
            event_id_kw = next(
                (kw for kw in node.keywords if kw.arg == "event_id"), None
            )
            assert event_id_kw is not None, f"log_event missing event_id in {path}"
            assert isinstance(event_id_kw.value, ast.Constant) and isinstance(
                event_id_kw.value.value, str
            ), f"log_event event_id must be string literal in {path}"
            discovered.add(event_id_kw.value.value)

    assert discovered.issubset(ALL_EVENT_IDS)


def test_logging_configuration_is_idempotent_for_json_stdout_handler() -> None:
    configure_logging("INFO")
    configure_logging("INFO")
    root = logging.getLogger()
    json_handlers = [
        handler
        for handler in root.handlers
        if getattr(handler, "name", "") == "pathos-json-stdout"
    ]
    assert len(json_handlers) == 1


def test_harness__event_id_coverage_and_schema(monkeypatch, tmp_path, capsys) -> None:
    original_usajobs_search = USAJobsClient.search_jobs
    monkeypatch.setenv("PATHOS_API_KEYS", "k1")
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "harness_main.db"))
    monkeypatch.setattr(
        "app.services.job_search_service.JobSearchService.search_jobs",
        lambda *a, **k: _make_search_response(["A1"]),
    )
    monkeypatch.setattr(
        "app.services.job_search_service.JobSearchService.execute_search",
        lambda *a, **k: execution_from_response(_make_search_response(["A1"])),
    )
    monkeypatch.setattr(
        "app.services.job_search_service.JobSearchService.fingerprint_params",
        lambda _: "fp-harness",
    )

    app = create_app()

    @app.get("/api/v1/test-500-harness")
    def test_500_harness() -> dict:
        raise RuntimeError("boom")

    @app.get("/api/v1/test-migration-harness")
    def test_migration_harness() -> dict:
        raise MigrationSafetyError("migration required")

    with TestClient(app, raise_server_exceptions=False) as client:
        client.get("/health/ready")
        client.get("/api/v1/desktop/overview", headers={"Authorization": "Bearer k1"})
        client.get("/api/v1/not-found-harness", headers={"Authorization": "Bearer k1"})
        client.post("/api/v1/desktop/overview", headers={"Authorization": "Bearer k1"})
        client.post(
            "/api/v1/threads",
            headers={"Authorization": "Bearer k1"},
            json={"store_thread": True},
        )
        client.get("/api/v1/test-500-harness", headers={"Authorization": "Bearer k1"})
        client.get(
            "/api/v1/test-migration-harness", headers={"Authorization": "Bearer k1"}
        )
        monkeypatch.setattr(
            "app.api.v1.health.ensure_database_ready",
            lambda **_: MigrationSafetyResult(
                db_revision="old_revision",
                alembic_head="new_revision",
                migration_status="mismatch",
                message="Database schema revision mismatch detected.",
            ),
        )
        client.get("/health/ready")
        _mock_diagnostics_success(monkeypatch)
        client.get(
            "/api/v1/diagnostics/usajobs", headers={"Authorization": "Bearer k1"}
        )
        _mock_diagnostics_failure(monkeypatch)
        client.get(
            "/api/v1/diagnostics/usajobs", headers={"Authorization": "Bearer k1"}
        )
        monkeypatch.setenv("USAJOBS_API_KEY", "")
        monkeypatch.setenv("USAJOBS_USER_AGENT", "")
        client.get(
            "/api/v1/diagnostics/usajobs", headers={"Authorization": "Bearer k1"}
        )
        # Reset env for later worker startup checks in this harness.
        monkeypatch.setenv("USAJOBS_API_KEY", "x")
        monkeypatch.setenv("USAJOBS_USER_AGENT", "test@example.com")

    saved = SavedSearchService.create(
        SavedSearchCreateRequest(
            name="Harness",
            query=JobSearchRequest(keyword="analyst"),
            ruleset_version="job-scoring-v1",
        )
    )
    rule = AlertRuleService.create(
        AlertRuleCreateRequest(
            saved_search_id=saved.id,
            min_score_threshold=0,
            max_per_day=10,
            cooldown_hours=0,
        )
    )
    AlertRuleService.create(
        AlertRuleCreateRequest(
            saved_search_id=saved.id,
            min_score_threshold=0,
            max_per_day=10,
            cooldown_hours=0,
        )
    )
    AlertsRunService.run_enabled_rules(request_id="req-alert-success")
    AlertsRunService.run_enabled_rules(
        request_id="req-alert-dry-run",
        dry_run_mode=True,
    )
    AlertsRunService.run_enabled_rules(
        request_id="req-alert-delivery-disabled",
        delivery_enabled=False,
    )
    AlertsRunService.run_enabled_rules(
        request_id="req-alert-budget", max_rules_evaluated=1
    )

    AlertSchedulerLockRepo.try_acquire(
        lock_name=AlertsRunService.LOCK_NAME,
        owner_run_id="lock-holder",
        acquired_at="2026-02-15T00:00:00+00:00",
        expires_at="2099-01-01T00:00:00+00:00",
    )
    AlertsRunService.run_enabled_rules(request_id="req-alert-lock")
    AlertSchedulerLockRepo.release(
        lock_name=AlertsRunService.LOCK_NAME, owner_run_id="lock-holder"
    )

    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "harness_failed.db"))
    saved_failed = SavedSearchService.create(
        SavedSearchCreateRequest(
            name="HarnessFail",
            query=JobSearchRequest(keyword="analyst"),
            ruleset_version="job-scoring-v1",
        )
    )
    AlertRuleService.create(
        AlertRuleCreateRequest(
            saved_search_id=saved_failed.id,
            min_score_threshold=0,
            max_per_day=10,
            cooldown_hours=0,
        )
    )
    monkeypatch.setattr(
        "app.services.saved_search_runner_service.SavedSearchRunnerService.run_saved_search",
        lambda *a, **k: (_ for _ in ()).throw(ValueError("forced failure")),
    )
    AlertsRunService.run_enabled_rules(request_id="req-alert-failed")

    monkeypatch.setattr(
        "app.services.alerts_run_service.AlertsRunService.run_enabled_rules",
        lambda request_id, **kwargs: AlertRunSummary(
            run_id="run-worker",
            started_at=datetime(2026, 2, 14, 0, 0, tzinfo=timezone.utc),
            ended_at=datetime(2026, 2, 14, 0, 1, tzinfo=timezone.utc),
            status="success",
            rules_evaluated=0,
            jobs_scanned=0,
            triggers_count=0,
            suppressed_count=0,
            per_rule=[],
            domain_outcome=DomainOutcome.EMPTY,
            error_summary=None,
        ),
    )
    run_alerts_once()
    monkeypatch.setattr(
        "app.services.alerts_run_service.AlertsRunService.run_enabled_rules",
        lambda request_id, **kwargs: (_ for _ in ()).throw(RuntimeError("worker fail")),
    )
    run_alerts_once()
    monkeypatch.setenv("WORKER_ENABLED", "false")
    run_alerts_once()
    monkeypatch.setenv("WORKER_ENABLED", "true")

    monkeypatch.setenv("USAJOBS_API_KEY", "")
    try:
        run_alerts_once()
    except StartupValidationError:
        pass
    try:
        validate_startup_config(mode="worker")
    except StartupValidationError:
        pass

    del rule
    monkeypatch.setattr(
        "app.adapters.usajobs.client.USAJobsClient.search_jobs", original_usajobs_search
    )

    _emit_usajobs_success(monkeypatch)

    monkeypatch.setenv("TELEMETRY_ENABLED", "true")
    TelemetryService.record_metric(metric_key="harness_events", duration_ms=1)
    TelemetryService.get_summary()

    RetentionService.cleanup()
    WipeService.wipe(wipe_threads=False, wipe_audits=False)

    # Emit export integrity event in the harness run.
    ExportService.export_recent(limit=1)

    # Emit narration fallback event in the harness run.
    fixture_path = (
        Path(__file__).parent / "fixtures" / "advisor_input_apply_remote.json"
    )
    advisor_input = AdvisorInput.model_validate(
        json.loads(fixture_path.read_text(encoding="utf-8"))
    )
    evaluation = AdvisorService.evaluate(advisor_input)
    monkeypatch.setattr(
        "app.llm.client.OpenAIClient.generate_text",
        lambda *a, **k: (_ for _ in ()).throw(RuntimeError("forced narration failure")),
    )
    NarrationService.narrate(evaluation=evaluation, tone="default")

    output = capsys.readouterr().out
    rows = _parse_json_log_lines(output)
    event_rows = [row for row in rows if "event_id" in row]
    emitted_event_ids = {str(row.get("event_id")) for row in event_rows}

    assert ALL_EVENT_IDS.issubset(emitted_event_ids)
    required_operational_events = {
        "worker_run_started",
        "worker_run_ended",
        "worker_run_failed",
        "migration_audit_written",
        "export_hash_generated",
        "poison_pill_quarantined",
        "budget_exceeded",
    }
    run_scoped_events = {
        "worker_run_started",
        "worker_run_ended",
        "worker_run_failed",
        "poison_pill_quarantined",
        "budget_exceeded",
    }
    assert required_operational_events.issubset(emitted_event_ids)

    forbidden_markers = ("authorization", "api_key", "token", "password")
    request_scope_event_ids = {
        "request_complete",
        "http_exception",
        "validation_exception",
        "migration_safety_exception",
        "unhandled_exception",
    }
    for row in event_rows:
        assert isinstance(row.get("message"), str)
        assert isinstance(row.get("level"), str)
        assert isinstance(row.get("event_id"), str)
        if row["event_id"] in run_scoped_events:
            assert isinstance(row.get("run_id"), str) and row.get("run_id")
        if row["event_id"] in request_scope_event_ids:
            assert isinstance(row.get("request_id"), str) and row.get("request_id")
        if row["event_id"] in {
            "config_validation_failed",
            "usajobs_config_missing",
            "usajobs_diagnostics_test_started",
            "usajobs_diagnostics_test_completed",
            "usajobs_diagnostics_test_failed",
        }:
            continue
        serialized = json.dumps(row, sort_keys=True).lower()
        for marker in forbidden_markers:
            assert marker not in serialized
