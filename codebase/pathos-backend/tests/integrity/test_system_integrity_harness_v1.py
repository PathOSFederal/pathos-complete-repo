from __future__ import annotations

import json
from hashlib import sha256
from pathlib import Path

from fastapi.testclient import TestClient

from app.adapters.usajobs.types import USAJobsSearchResponse, UpstreamAuditSummary
from app.db.repo.upstream_audit_repo import UpstreamAuditRepo
from app.main import create_app
from app.models.alert_rule import AlertDecision


def _single_result_upstream() -> USAJobsSearchResponse:
    return USAJobsSearchResponse(
        payload={
            "SearchResult": {
                "SearchResultCountAll": 1,
                "SearchResultItems": [
                    {
                        "MatchedObjectId": "J-OK",
                        "MatchedObjectDescriptor": {
                            "PositionID": "PID-J-OK",
                            "PositionTitle": "Data Analyst",
                            "OrganizationName": "Agency X",
                            "PositionLocationDisplay": "Remote",
                            "PositionLocation": [{"LocationName": "Remote"}],
                            "PositionRemuneration": [
                                {"MinimumRange": "60000", "MaximumRange": "90000"}
                            ],
                            "UserArea": {
                                "Details": {
                                    "LowGrade": "9",
                                    "HighGrade": "11",
                                    "PositionURI": "https://www.usajobs.gov/job/1",
                                    "ApplyURI": ["https://www.usajobs.gov/job/1/apply"],
                                    "RemoteIndicator": True,
                                    "PublicationStartDate": "2026-01-01",
                                    "ApplicationCloseDate": "2026-01-10",
                                }
                            },
                        },
                    }
                ],
            }
        },
        audit=UpstreamAuditSummary(
            endpoint="/api/search",
            query_hash="harness-query-hash",
            status_code=200,
            latency_ms=5,
            result_count=1,
            error_class=None,
        ),
    )


def _advisor_fixture(name: str) -> dict:
    path = Path("tests") / "fixtures" / name
    return json.loads(path.read_text(encoding="utf-8"))


def test_system_integrity_harness_v1(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "integrity_harness.db"))
    monkeypatch.setenv("USAJOBS_API_KEY", "k")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "ua@example.com")
    monkeypatch.setattr(
        "app.adapters.usajobs.client.USAJobsClient.search_jobs",
        lambda self, query_params: _single_result_upstream(),  # noqa: ARG005
    )
    monkeypatch.setattr(
        "app.services.alerts_run_service.get_alert_rule_min_interval_minutes",
        lambda: 0,
    )

    # Keep alert runs deterministic and idempotent for identical input.
    monkeypatch.setattr(
        "app.services.alerts_run_service.AlertEvaluator.evaluate_rule",
        lambda **_: [
            AlertDecision(
                job_id="J-OK",
                score=95,
                reasons_summary=["ROLE_MATCH_STRONG"],
                triggered=True,
                suppression_reason=None,
            )
        ],
    )
    monkeypatch.setattr(
        "app.services.alerts_run_service.SavedSearchRunnerService.run_saved_search",
        lambda saved_search_id, request_id, resume_cursor=None: {
            "saved_search_id": saved_search_id,
            "request_id": request_id,
            "results": [
                {
                    "job": {"id": "J-OK", "title": "Data Analyst"},
                    "score": {
                        "final_score": 95,
                        "reasons": [{"code": "ROLE_MATCH_STRONG"}],
                    },
                }
            ],
            "timings_ms": {
                "usajobs_fetch_ms": 1,
                "normalize_ms": 1,
                "score_ms": 1,
            },
            "query_fingerprint": "fp-fixed",
            "ruleset_version": "job-scoring-v1",
            "mapper_version": "usajobs-normalize-v1",
            "resume_cursor_used": resume_cursor or {"strategy": "full_refresh"},
        },
    )

    app = create_app(mode="openapi")
    with TestClient(app) as client:
        search_response = client.post(
            "/api/v1/jobs/search",
            json={"keyword": "analyst", "page": 1, "page_size": 20},
        )
        assert search_response.status_code == 200
        assert search_response.json()["total"] == 1

        upstream_rows = UpstreamAuditRepo.list_recent(limit=1)
        assert len(upstream_rows) == 1
        upstream_raw_payload_json = upstream_rows[0]["upstream_raw_payload_json"]
        upstream_raw_hash = upstream_rows[0]["upstream_raw_hash"]
        assert isinstance(upstream_raw_payload_json, str)
        assert isinstance(upstream_raw_hash, str)
        assert (
            sha256(upstream_raw_payload_json.encode("utf-8")).hexdigest()
            == upstream_raw_hash
        )
        # Re-read to prove no mutation/integrity violations for unchanged rows.
        second_read = UpstreamAuditRepo.list_recent(limit=1)
        assert second_read[0]["upstream_raw_hash"] == upstream_raw_hash

        saved = client.post(
            "/api/v1/saved-searches",
            json={"name": "Integrity Search", "query": {"keyword": "analyst"}},
        )
        assert saved.status_code == 200
        saved_id = saved.json()["id"]

        rule = client.post(
            "/api/v1/alerts/rules",
            json={
                "saved_search_id": saved_id,
                "min_score_threshold": 0,
                "max_per_day": 10,
                "cooldown_hours": 0,
            },
        )
        assert rule.status_code == 200

        run_one = client.post("/api/v1/alerts/run")
        run_two = client.post("/api/v1/alerts/run")
        assert run_one.status_code == 200
        assert run_two.status_code == 200

        run_one_payload = run_one.json()
        run_two_payload = run_two.json()
        assert run_one_payload["jobs_scanned"] == run_two_payload["jobs_scanned"] == 1
        assert (
            run_one_payload["triggers_count"] == run_two_payload["triggers_count"] == 1
        )

        digests_response = client.get("/api/v1/alerts/digests?limit=2")
        assert digests_response.status_code == 200
        digests = digests_response.json()
        assert len(digests) >= 2
        totals_first = digests[0]["payload_json"]["totals"]
        totals_second = digests[1]["payload_json"]["totals"]
        assert totals_first["above_threshold"] == totals_second["above_threshold"] == 1
        assert totals_first["suppressed"] == totals_second["suppressed"] == 0
        assert (totals_first.get("new", 0) + totals_first.get("unchanged", 0)) == 1
        assert (totals_second.get("new", 0) + totals_second.get("unchanged", 0)) == 1

        advisor_input = _advisor_fixture("advisor_input_apply_remote.json")
        eval_response = client.post("/api/v1/advisor/evaluate", json=advisor_input)
        assert eval_response.status_code == 200
        eval_payload = eval_response.json()
        trace_id = eval_payload["meta"]["trace_id"]

        thread = client.post(
            "/api/v1/threads",
            json={"title": "Integrity Export Thread", "store_thread": True},
        )
        assert thread.status_code == 200
        thread_id = thread.json()["thread"]["thread_id"]

        message = client.post(
            f"/api/v1/threads/{thread_id}/messages",
            json={
                "role": "user",
                "content": "link audit",
                "trace_id": trace_id,
                "store_thread": True,
            },
        )
        assert message.status_code == 200

        export_one = client.get(f"/api/v1/export/thread/{thread_id}")
        export_two = client.get(f"/api/v1/export/thread/{thread_id}")
        assert export_one.status_code == 200
        assert export_two.status_code == 200
        export_one_payload = export_one.json()
        export_two_payload = export_two.json()
        assert export_one_payload["export_hash"] == export_two_payload["export_hash"]
        assert export_one_payload["hash_alg"] == "sha256"
        assert len(export_one_payload["linked_audits"]) >= 1

        monkeypatch.setattr(
            "app.llm.client.OpenAIClient.generate_text",
            lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("llm down")),
        )
        narrate_response = client.post(
            "/api/v1/advisor/evaluate-and-narrate",
            json={"advisor_input": advisor_input, "tone": "direct"},
        )
        assert narrate_response.status_code == 200
        narrate_payload = narrate_response.json()
        assert narrate_payload["narration_mode"] == "fallback"

        deterministic_fields = [
            "recommendation",
            "confidence_band",
            "reasons",
            "risks",
            "next_actions",
            "evidence",
        ]
        for field in deterministic_fields:
            assert narrate_payload["evaluation"][field] == eval_payload[field]

        ready = client.get("/health/ready")
        assert ready.status_code == 200
        ready_payload = ready.json()
        assert ready_payload["status"] == "ready"
        assert ready_payload["migration_status"] == "ok"
