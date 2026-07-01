# Day 50: USAJOBS Lifecycle Guards

## What Changed

Day 50 makes the USAJOBS sync safer when a run sees only part of a saved-search partition. Missing jobs are no longer closed unless close-missing is explicitly requested and the caller proves the partition was complete.

## Why Partial Syncs Cannot Safely Close Jobs

A bounded staging run, failed page, rate limit, schema error, or max-page clamp can miss valid USAJOBS records. Treating those missing records as closed would create stale or false lifecycle changes for healthy jobs.

## Partition Completeness

A partition is complete only when the caller marks it complete, provides an explicit partition identity, the run is not dry-run, the mode is not bounded staging validation, and the fetched record count matches the upstream total. Truncated or ambiguous partitions fail closed and record a skipped close-missing reason.

## Staging Bounded Validation

The staging CLI remains no-close by default. Its bounded 1-2 page validation mode can write fetched jobs and queue rows, but it does not close jobs that are absent from that small slice.

## Reappeared And Expired Jobs

If a previously closed job appears again, the sync reopens it deterministically, writes a lifecycle change log, and queues an indexing update. If a job is ingested with a close date in the past, it is stored with an expired lifecycle state so downstream active-job assumptions do not treat it as open.

## What Remains Before Production

Day 51 ops health tests, Day 52 schema and transaction hardening, Day 53 full pytest runtime triage, Day 54 actual staging validation, Day 55 public job page sync contract alignment, and Day 56 rollout readiness remain before production.

Open Day 49 follow-ups also remain: telework negative phrase handling, `source.mapper_version` hash behavior, and an explicit JSON key-order hash stability test.
