# USAJOBS Wiring Report (Slices 76-80 Prep)

## Snapshot
- Repository path: `C:\dev\PathOS\codebase\pathos-backend`
- Observed branch at runtime: `develop` (not `feature/slices-76-80-back`)
- Generated on: 2026-02-20

## 1) Where the USAJOBS fetch happens

### USAJOBS client / fetch code
- `app/adapters/usajobs/client.py:47` class `USAJobsClient`
- `app/adapters/usajobs/client.py:57` method `USAJobsClient.search_jobs(query_params)`
- External call: `httpx.Client.get(...)` at `app/adapters/usajobs/client.py:95`

### Adapter layer (USAJOBS payload -> canonical job models)
- Primary normalization path:
  - `app/adapters/usajobs/normalize.py:80` function `normalize_search_items(...)`
  - Canonical output model source fields set at `app/adapters/usajobs/normalize.py:126`
- Legacy shim:
  - `app/adapters/usajobs/mapper.py:23` function `map_usajobs_item(item)` (delegates to `normalize_search_items`)
- Upstream schema models:
  - `app/adapters/usajobs/models.py:78` class `USAJobsEnvelope`
  - `app/adapters/usajobs/models.py:64` class `USAJobsSearchItem`

### Where Saved Searches "run" calls job fetch
- Endpoint:
  - `app/api/v1/alerts.py:143` function `run_saved_search(saved_search_id, request)`
- Service call:
  - `app/services/alert_service.py:55` function `AlertService.run_saved_search(...)`
- Job fetch:
  - `app/services/alert_service.py:72` calls `JobSearchService.search_jobs(...)`
  - `app/services/job_search_service.py:186` calls adapter `USAJobsClient.search_jobs(...)`

### Where Alerts "run" calls job fetch
- Endpoint:
  - `app/api/v1/alerts.py:40` function `run_alerts(request)`
- Orchestration:
  - `app/services/alerts_run_service.py:79` function `AlertsRunService.run_enabled_rules(...)`
- Per-rule saved search runner:
  - `app/services/alerts_run_service.py:224` calls `SavedSearchRunnerService.run_saved_search(...)`
  - `app/services/saved_search_runner_service.py:39` calls `JobSearchService.search_jobs(...)`
  - `app/services/job_search_service.py:186` calls `USAJobsClient.search_jobs(...)`

### Where Digests pull data / results
- Desktop digest endpoint:
  - `app/api/v1/desktop.py:48` function `desktop_list_latest_digests(...)`
  - `app/api/v1/desktop.py:51` calls `AlertDigestService.list_desktop_latest(...)`
- Digest read path:
  - `app/services/alert_digest_service.py:47` function `list_desktop_latest(...)`
  - `app/db/repo/alert_digest_repo.py:32` function `list_recent(...)` reads `alert_digests`
- Digest write path (source of those rows):
  - `app/services/alerts_run_service.py:290` transport selection
  - `app/services/delivery_transport_service.py:18` class `LocalDigestTransport`
  - `app/services/delivery_transport_service.py:20` calls `AlertDigestRepo.create(...)`

## 2) How adapter selection works (decision tree)

## Job fetch adapter selection
1. `JobSearchService.search_jobs(...)` receives optional `client` param (`app/services/job_search_service.py:161`).
2. It selects adapter with:
   - `adapter = client or USAJobsClient()` at `app/services/job_search_service.py:176`
3. Therefore:
   - If caller injects `client`, that injected implementation is used (mostly test monkeypatch/injection).
   - If caller does not inject, runtime always uses `USAJobsClient`.

## Mock vs usajobs conclusion
- There is **no env flag / feature flag** in production code that switches between mock/usajobs adapter.
- Mock behavior is test-time only (injection/monkeypatch), not env-driven runtime routing.

## Separate transport selection (digests, not USAJOBS fetch)
- `AlertsRunService._pick_transport(delivery_mode)` chooses:
  - `"email_digest_future"` -> `EmailDigestFutureTransport`
  - otherwise -> `LocalDigestTransport`
- Source: `app/services/alerts_run_service.py:69`

## 3) Env vars and settings

| Env var | Where read | Default | Required at runtime? | Purpose |
|---|---|---|---|---|
| `USAJOBS_API_KEY` | `app/core/config.py:65`, getter `get_usajobs_api_key()` at `app/core/config.py:169`; validated at startup `app/core/startup_validation.py:35`; checked before fetch `app/adapters/usajobs/client.py:70` | `""` | Yes for `mode in {"api","worker"}` startup validation; adapter also enforces non-empty | USAJOBS auth header value (`Authorization-Key`) |
| `USAJOBS_USER_AGENT` | `app/core/config.py:66`, getter at `app/core/config.py:267`; startup validation `app/core/startup_validation.py:37`; adapter check `app/adapters/usajobs/client.py:72` | `""` | Yes for `mode in {"api","worker"}` startup validation; adapter also enforces non-empty | Required USAJOBS user-agent identity header |
| `USAJOBS_HOST` | `app/core/config.py:67`, getter at `app/core/config.py:261` | `"data.usajobs.gov"` | Optional currently (getter exists, not used by client) | Configurable host header value (currently adapter derives from URL) |
| `USAJOBS_API_BASE_URL` | `app/core/config.py:68`, getter at `app/core/config.py:255`; consumed in adapter init `app/adapters/usajobs/client.py:52` | `"https://data.usajobs.gov"` | Optional | Base URL for USAJOBS API |
| `USAJOBS_TIMEOUT_SECONDS` | `app/core/config.py:69`, getter at `app/core/config.py:273`; consumed in adapter init `app/adapters/usajobs/client.py:55` | `10.0` | Optional | HTTP timeout seconds for upstream call |
| `USAJOBS_CACHE_TTL_SECONDS` | `app/core/config.py:70`, getter at `app/core/config.py:279`; consumed in service `app/services/job_search_service.py:179` | `60` | Optional | In-memory response cache TTL |
| `PATHOS_ENV` | `app/core/config.py:75`, getter at `app/core/config.py:195`; startup validation `app/core/startup_validation.py:30` | `"local"` | Required to be one of allowed values (else startup validation fails) | Runtime env label and startup guardrail |
| `PATHOS_WORKER_INTERVAL_SECONDS` | `app/core/config.py:84`, getter at `app/core/config.py:249`; startup validation in worker mode `app/core/startup_validation.py:40` | `3600` | Required only for worker mode validity | Worker scheduler interval |

### Required headers used for USAJOBS request
- Built in adapter at `app/adapters/usajobs/client.py:79`
- Headers set:
  - `Host` (derived from URL)
  - `User-Agent` (from env)
  - `Authorization-Key` (from env)

## 4) Endpoint call chain traces (with file:line)

### A) `POST /saved-searches/{id}/run`
1. Endpoint handler:
   - `app/api/v1/alerts.py:143` `run_saved_search(...)`
2. Service orchestration:
   - `app/services/alert_service.py:55` `AlertService.run_saved_search(...)`
3. Fetch provider/client:
   - `app/services/alert_service.py:72` -> `JobSearchService.search_jobs(...)`
   - `app/services/job_search_service.py:176` adapter selection
   - `app/services/job_search_service.py:186` -> `USAJobsClient.search_jobs(...)`
   - `app/adapters/usajobs/client.py:95` outbound GET
4. Adapter/mapper:
   - `app/services/job_search_service.py:253` validate `USAJobsEnvelope`
   - `app/services/job_search_service.py:257` `normalize_search_items(...)`
5. Persistence:
   - Upstream audit rows: `app/services/job_search_service.py:187`, write via `app/db/repo/upstream_audit_repo.py:27`
   - Saved-search run row: `app/services/alert_service.py:83`, write via `app/db/repo/saved_search_repo.py:182`
   - Saved-search last_run update: `app/services/alert_service.py:96`, write via `app/db/repo/saved_search_repo.py:166`
   - Alert row for new IDs: `app/services/alert_service.py:109`, write via `app/db/repo/alert_repo.py:25`

### B) `POST /alerts/run`
1. Endpoint handler:
   - `app/api/v1/alerts.py:40` `run_alerts(...)`
2. Service orchestration:
   - `app/services/alerts_run_service.py:79` `AlertsRunService.run_enabled_rules(...)`
   - Enabled rules loaded: `app/services/alerts_run_service.py:161` via `app/db/repo/alert_rule_repo.py:58`
3. Per-rule fetch:
   - `app/services/alerts_run_service.py:224` -> `SavedSearchRunnerService.run_saved_search(...)`
   - `app/services/saved_search_runner_service.py:39` -> `JobSearchService.search_jobs(...)`
   - `app/services/job_search_service.py:186` -> `USAJobsClient.search_jobs(...)`
   - `app/adapters/usajobs/client.py:95` outbound GET
4. Adapter/mapper:
   - `app/services/job_search_service.py:253` envelope validation
   - `app/services/job_search_service.py:257` `normalize_search_items(...)`
5. Persistence:
   - Run start/update rows: `app/services/alerts_run_service.py:99` and `app/services/alerts_run_service.py:436`, writes via `app/db/repo/alert_run_repo.py:12` and `app/db/repo/alert_run_repo.py:47`
   - Rule-run rows: `app/services/alerts_run_service.py:343` / `app/services/alerts_run_service.py:383`, writes via `app/db/repo/alert_rule_run_repo.py:12`
   - Digest rows: `app/services/delivery_transport_service.py:20`, writes via `app/db/repo/alert_digest_repo.py:12`

### C) `GET /desktop/digests/latest`
1. Endpoint handler:
   - `app/api/v1/desktop.py:48` `desktop_list_latest_digests(...)`
2. Service:
   - `app/services/alert_digest_service.py:47` `list_desktop_latest(...)`
3. Data source:
   - `app/db/repo/alert_digest_repo.py:32` `list_recent(...)`
4. Upstream fetch involvement:
   - None directly in this read endpoint.
   - It reads previously persisted digest payloads produced during `POST /alerts/run`.

## 5) What is missing / why `jobs_scanned` may be 0

- No enabled alert rules:
  - `AlertsRunService` loops `AlertRuleRepo.list_enabled()` (`app/services/alerts_run_service.py:161`), so zero enabled rules yields zero scanned.
- Guardrail skip due min interval:
  - `app/services/alerts_run_service.py:181` checks previous run time and can skip rule with `jobs_scanned=0`.
- Upstream errors before result handling:
  - Per-rule run errors are captured and rule contributes zero scans (`app/services/alerts_run_service.py:372`).
- Saved-search endpoint confusion:
  - `POST /saved-searches/{id}/run` does job fetch, but `jobs_scanned` metric is part of alert-run summary (`/alerts/run`) not this endpoint.
- Empty result set from upstream/mapping/filtering:
  - `results` can be empty after search and optional remote filter (`app/services/job_search_service.py:258`).

## 6) Minimal next steps to enable `jobs_scanned > 0` safely (no secrets)

1. Confirm runtime mode passes startup validation with presence-only checks for:
   - `USAJOBS_API_KEY` and `USAJOBS_USER_AGENT` (`app/core/startup_validation.py:35`)
2. Confirm at least one enabled alert rule exists:
   - `AlertRuleRepo.list_enabled()` path (`app/db/repo/alert_rule_repo.py:58`)
3. Use `POST /api/v1/alerts/run` (not only `/saved-searches/{id}/run`) and inspect:
   - `GET /api/v1/alerts/runs`
   - `GET /api/v1/alerts/metrics/recent`
4. Verify structured logs for:
   - `usajobs_request_start`, `usajobs_request_complete`, `alert_rule_evaluated`, `alert_run_finished`
   - Event registry: `app/core/event_ids.py:5`
5. If still zero:
   - Check min-interval suppression behavior (`app/services/alerts_run_service.py:181`)
   - Check upstream audit rows (hash-only, no secrets): `UpstreamAuditRepo.list_recent(...)` in `app/db/repo/upstream_audit_repo.py:85`

## 7) Diagnostics endpoints / test utilities

### Existing diagnostics endpoints
- `GET /api/v1/alerts/runs` -> run summaries (`app/api/v1/alerts.py:48`)
- `GET /api/v1/alerts/metrics/recent` -> recent metrics including `jobs_scanned` (`app/api/v1/alerts.py:58`)
- `GET /api/v1/alerts/rules/{alert_rule_id}/history` -> per-rule history (`app/api/v1/alerts.py:53`)
- `GET /api/v1/desktop/digests/latest` -> desktop digest summaries (`app/api/v1/desktop.py:48`)
- `GET /api/v1/desktop/overview` -> aggregate observability (`app/api/v1/desktop.py:64`)

### Existing test utilities/evidence
- Mocked adapter usage in tests via monkeypatch/injection:
  - `tests/api/jobs/test__categories__jobs_search.py:52`
  - `tests/api/jobs/test__categories__job_score.py:49`
- Upstream audit table assertions:
  - `tests/integration/test_jobs_search.py:87`
- Missing-key regression:
  - `tests/api/jobs/test__missing_usajobs_key_returns_config_error.py:16`

## 8) What Slice 77 will touch next (logging hardening)

Centralize and harden structured logging in:
- `app/core/logging.py:52` (`log_event`)
- `app/core/event_ids.py:5` (event registry governance)
- `app/services/job_search_service.py:161` (search orchestration boundaries)
- `app/adapters/usajobs/client.py:57` (upstream call start/finish timing)
- `app/services/saved_search_runner_service.py:24` (run completion envelope)
- `app/services/alerts_run_service.py:79` (run/rule lifecycle metrics)

Recommended focus:
- Keep event names stable, enrich `details` payload shape deterministically, and preserve secret-safe logging (presence-only checks, no key/token values).
