# Backend Snapshot Contract Pack v1

Date: 2026-03-05
Branch: `feature/day-60-backend-snapshot-contract-pack-v1`

## What Was Added

- Added deterministic snapshot contract module under `app/intelligence/snapshots/`:
  - `models.py` for request/response contract schemas.
  - `engine.py` for deterministic computation stubs.
  - `hashing.py` for stable input hashing and snapshot IDs.
  - `versions.py` for canonical version markers.
- Added API router `app/api/v1/intelligence.py` with four deterministic endpoints.
- Wired intelligence router into `app/main.py` under `/api/v1` with existing API key auth dependency.
- Added endpoint tests in `tests/test_intelligence_snapshot_contract_pack_v1.py`.

## Endpoint List

- `POST /api/v1/intelligence/career-readiness`
- `POST /api/v1/intelligence/resume-readiness`
- `POST /api/v1/intelligence/job-match`
- `POST /api/v1/intelligence/application-confidence`

## Schema Summary

Shared primitives:
- `SnapshotMeta`
- `EvidenceRef`
- `MissingEvidence`
- `ReasonItem`

Request contracts:
- `CareerReadinessRequest`
- `ResumeReadinessRequest`
- `JobMatchRequest`
- `ApplicationConfidenceRequest`

Snapshot contracts:
- `CareerReadinessSnapshot`
- `ResumeReadinessSnapshot`
- `JobMatchSnapshot`
- `ApplicationConfidenceSnapshot`

Each snapshot includes:
- score fields
- `reasons[]`
- `evidence_used[]`
- `missing_evidence[]`
- `rule_version`
- `knowledge_pack_version`
- `input_hash`
- `snapshot_id`
- `generated_at`

## Determinism Boundaries

- Deterministic by input for:
  - `input_hash`
  - `snapshot_id`
  - all score and explanation fields
- Non-deterministic by design:
  - `generated_at` timestamp (UTC now)
- No LLM calls are used in snapshot computation.
- No USAJOBS scraping changes were introduced.
- Endpoint logs contain only structured correlation metadata and exclude raw `resume_text` and raw job payloads.

## Follow-ups

- Integrate Career Graph knowledge pack (versioned role templates and weighted signals).
- Integrate Person Graph resume/profile evidence extraction and canonical evidence refs.
- Optional persistence layer for snapshot payloads if/when low-risk DB path is approved.
