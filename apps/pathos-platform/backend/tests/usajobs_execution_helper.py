from __future__ import annotations

from app.adapters.usajobs.normalize import NormalizedUSAJobsItem
from app.models.job_search import JobSearchResponse
from app.services.job_search_service import JobSearchExecutionResult


def execution_from_response(
    response: JobSearchResponse,
    *,
    query_fingerprint: str = "fp-fixed",
    fetched_at: str = "2026-02-14T00:00:00+00:00",
    upstream_audit_id: str = "audit-fixed",
    upstream_raw_hash: str = "raw-fixed",
) -> JobSearchExecutionResult:
    return JobSearchExecutionResult(
        response=response,
        normalized_items=tuple(
            NormalizedUSAJobsItem(job=job, warnings=()) for job in response.results
        ),
        query_fingerprint=query_fingerprint,
        mapper_version="usajobs-normalize-v1",
        source_name="USAJOBS_OFFICIAL_API",
        fetched_at=fetched_at,
        upstream_audit_id=upstream_audit_id,
        upstream_raw_hash=upstream_raw_hash,
        query_slice={
            "page": response.page,
            "page_size": response.page_size,
            "remote_only": False,
            "query_fingerprint": query_fingerprint,
        },
    )
