# Day 35: Deterministic Job Scoring and Explainability v1

## Inputs
- Canonical job (`CanonicalJob`) resolved from deterministic `/api/v1/jobs/search`.
- Scoring profile v1 (`JobScoringProfileV1`):
  - `preferred_series`
  - `preferred_grades` (`min`/`max`)
  - `preferred_locations`
  - `remote_preference` (`no_preference`, `remote_only`, `onsite_only`, or bool fallback)
  - `relocation_radius_miles`
  - `keywords`
- Versioned ruleset (`job-scoring-v1`) with fixed weights and confidence thresholds.

## Outputs
- `JobScoreResult` with:
  - `final_score` (0-100)
  - `confidence_band` (`Low`/`Medium`/`High`)
  - `reasons[]` (`code`, `message`)
  - `risks[]` (`code`, `message`)
  - `breakdown` per-dimension sub-scores
  - `ruleset_version`
  - `mapper_version` (from canonical source metadata when present)
  - `computed_at`

## Determinism Guarantees
- No LLM calls, no random values.
- Canonicalized profile list fields are trim/dedupe/sort.
- Fixed ruleset and thresholds; same inputs produce same scoring output.
- Score endpoint records deterministic audit summary rows using hashed payload identity.

## Ruleset Versioning
- Rules are defined in `app/services/job_scoring_ruleset.py`.
- Current default version: `job-scoring-v1`.
- Future behavior changes should ship with a new ruleset version string and explicit tests.
