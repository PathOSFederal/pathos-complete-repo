# Day 49: USAJOBS Canonical Normalization

## What Changed

Day 49 makes the USAJOBS ingestion path populate real canonical job fields from official USAJOBS Search API-shaped payloads. The sync now normalizes identifiers, announcement numbers, agency and department names, series, grade and pay plan, salary ranges, locations, remote and telework status, opening and closing dates, official apply/source links, required documents, qualifications, duties, hiring path, status, and stable content hashes through the production normalizer.

## Why Real Normalization Matters

The staging sync cannot be trusted if tests only inject fields into ad hoc dictionaries after ingestion. Operators need confidence that the same official USAJOBS payload shape fetched in staging becomes the canonical job record used for change detection, alerts, indexing, and future public job pages.

## Why Ad Hoc Field Injection Was Not Enough

Ad hoc injected fields prove repository comparison behavior, but they do not prove that USAJOBS payloads are parsed correctly. Day 49 adds fixture coverage shaped like real USAJOBS responses so tests exercise the adapter model, normalizer, job search service, ingestion service, change log, and queue path together.

## Remote And Telework Separation

Fully remote work and telework eligibility are stored separately. A USAJOBS remote indicator can mark a job as fully remote, but telework text or a telework eligibility flag does not make a job fully remote. Location-negotiable announcements are classified separately from fully remote announcements.

## Official Links

The sync preserves the official USAJOBS apply URL and announcement source URL when USAJOBS provides them. If the source URL is absent but a USAJOBS job id exists, the normalizer builds the official `https://www.usajobs.gov/job/<id>` announcement URL.

## What Remains Before Production

Day 50 lifecycle guards, Day 51 ops health tests, Day 52 schema and transaction hardening, Day 53 full pytest runtime triage, Day 54 actual staging validation, Day 55 public job page sync contract alignment, and Day 56 rollout readiness remain before production.
