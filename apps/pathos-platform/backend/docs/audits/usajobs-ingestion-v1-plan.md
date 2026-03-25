# USAJOBS Ingestion v1 Plan

## 1. Goal
Define and implement a bounded real USAJOBS ingestion foundation that is official-API-only, deterministic, auditable, and sufficient to support the first qualification and decision modules without turning the backend into a broad ETL platform.

## 2. Source policy
USAJOBS official API is the only allowed ingestion source for runtime backend ingestion.

Repo-grounded evidence:
- official adapter client: `app/adapters/usajobs/client.py`
- default base URL: `https://data.usajobs.gov`
- outbound search path: `/api/search`
- diagnostics doc already confirms no runtime mock/alternate source flag in production code: `docs/diagnostics/usajobs-wiring-report.md`

No scraping, no third-party mirrors, and no client-side ingestion path should be introduced.

## 3. Proposed ingestion scope for v1
Recommend a bounded v1 slice:
- source
  - official USAJOBS search results only
- record type
  - vacancy/search result records sufficient for deterministic qualification/match evaluation
- operational scope
  - ingestion driven by:
    - request-time search through `app/services/job_search_service.py`
    - bounded saved-search/alert worker runs through `app/services/saved_search_runner_service.py` and `app/services/alerts_run_service.py`
- persistence scope
  - preserve upstream audit records and canonicalized job snapshots tied to saved-search runs
- exclusion scope for v1
  - no broad historical warehousing
  - no separate large-scale crawl
  - no document scraping beyond official API payloads
  - no full labor-market ingestion platform

This keeps v1 small enough to harden while still providing real data for calibration and qualification-engine work.

## 4. Canonical model strategy
- existing code to keep
  - canonical job model: `app/domain/jobs/canonical_models.py`
  - mapper: `app/adapters/usajobs/normalize.py`
  - validation envelope: `app/adapters/usajobs/models.py`
  - service boundary: `app/services/job_search_service.py`
- strategy
  - keep USAJOBS payload parsing in adapter models
  - keep canonical runtime-owned job shape in `CanonicalJob`
  - keep mapper version attached in `CanonicalSourceMetadata.mapper_version`
  - validate upstream payloads before normalization
  - retain raw upstream payload hashes and bounded raw payload JSON in upstream audit storage for provenance
- likely next file touches
  - `app/domain/jobs/canonical_models.py`
  - `app/adapters/usajobs/normalize.py`
  - `app/adapters/usajobs/models.py`
  - `app/db/repo/upstream_audit_repo.py`
- versioning recommendation
  - keep mapper version explicit and increment it intentionally for schema or semantic changes
  - if canonical job shape expands for qualification work, version the mapper and document migration expectations

## 5. Sync/job design
- existing foundation
  - checkpointing: `app/services/saved_search_checkpoint_service.py`
  - checkpoint repo: `app/db/repo/saved_search_checkpoint_repo.py`
  - saved-search snapshots: `app/db/repo/saved_search_snapshot_repo.py`
  - orchestration: `app/services/alerts_run_service.py`
  - worker entrypoint: `app/worker/__init__.py`
- v1 design
  - use saved-search and alert-run paths as the bounded sync substrate rather than inventing a separate ingestion platform immediately
  - checkpoint each completed ingestion/evaluation outcome
  - preserve run ID, alert run ID, saved search ID, query fingerprint, cursor used, and next cursor
  - retain bounded exponential backoff behavior already present in `AlertsRunService._run_with_backoff`
  - keep lock-based single-run protection through `AlertSchedulerLockRepo`
- partitioning recommendation
  - partition by saved search / query fingerprint, not by arbitrary ETL shards
  - this matches current repo structure and keeps replay semantics understandable
- idempotency recommendation
  - treat each saved-search run as a deterministic ingestion unit
  - canonical fingerprint + checkpoint ledger should remain the idempotency anchor

## 6. Storage design
Store:
- upstream audit summary for every real upstream attempt
  - current table path: `upstream_api_audit_records`
  - why: provenance, incident review, mapper drift debugging
- bounded raw payload JSON plus hash
  - why: trust and replay/debug value
- canonicalized saved-search job snapshots
  - current path: `saved_search_job_snapshots`
  - why: delta detection, alert intelligence, deterministic comparisons
- checkpoint and ledger state
  - current paths: `saved_search_checkpoints`, `saved_search_ingestion_ledger`
  - why: idempotency, recovery, replayability

Avoid storing in v1:
- large unbounded historical corpora
- derived intelligence conclusions in place of raw provenance
- client-only transforms that bypass server auditability

## 7. Failure handling
- malformed upstream fields
  - validate through `USAJobsEnvelope`
  - if envelope validation fails, surface controlled schema error and write upstream audit metadata without pretending mapping succeeded
- partial payloads
  - allow canonicalization when specific optional fields are missing, as current mapper already does in limited cases
  - record missing/unknown canonical fields explicitly rather than inventing values
- mapper drift
  - preserve raw payload hash and mapper version
  - fail deterministically when payload shape changes beyond supported mapping assumptions
  - treat silent shape drift as a trust failure, not as a best-effort success
- upstream auth/rate limit/unavailable
  - keep current typed error mapping and retry/backoff behavior
  - keep config-missing as a local skip state, not a fake upstream failure

## 8. Test plan
Needed tests for ingestion v1:
- mapper tests
  - extend `tests/adapters/usajobs/test_mapper.py`
  - cover partial field presence, multi-location, missing salary/grade, remote flags, and canonical invariants
- adapter tests
  - extend `tests/api/jobs/test__positive__usajobs_client.py`
  - cover official header construction, timeout, auth rejection, invalid JSON, malformed status handling
- sync/idempotency tests
  - extend `tests/services/test_saved_search_runner_service.py`
  - extend `tests/services/test_saved_search_checkpoint_service.py`
  - extend `tests/test_worker_alerts.py`
  - verify repeat runs, resumed runs, and query fingerprint behavior
- failure-path tests
  - extend `tests/api/jobs/test__missing_usajobs_key_returns_config_error.py`
  - extend `tests/test_upstream_audit_integrity_slice93.py`
  - add malformed upstream payload and mapper-drift regressions
- audit/provenance tests
  - verify upstream audit row contents, raw hash integrity, and no secret leakage

## 9. Definition of done
USAJOBS ingestion v1 is complete enough when:
- official USAJOBS API is the only runtime source path
- canonical mapping is versioned, validated, and covered by mapper regression tests
- every real upstream attempt produces deterministic audit/provenance data
- saved-search/worker ingestion paths are idempotent and checkpointed
- malformed or partial upstream payloads are handled deterministically and audibly
- the ingestion surface is intentionally bounded and documented, not an accidental general ETL system
- qualification/decision modules can consume canonical USAJOBS job records without redesigning the ingestion foundation
