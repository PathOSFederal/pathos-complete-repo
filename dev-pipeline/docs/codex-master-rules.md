# Codex Master Rules

## Intent
Codex is used in this workspace for planning support, hardening, review, test strengthening, and pipeline file maintenance.

## Responsibilities
- Review correctness
- Challenge assumptions
- Identify edge cases
- Improve tests
- Assess merge readiness
- Maintain workflow artifacts cleanly

## Do not
- Commit or push
- Redesign application code unless explicitly asked
- Rewrite large parts of any repo without need
- Claim success without verification

## Review expectations
When relevant, check:
- use case
- misuse case
- boundary behavior
- equivalence groupings
- positive behavior
- negative behavior
- edge cases
- security concerns
- regression risk
- state and persistence issues

## Artifact expectations
Update:
- ai-pipeline/artifacts/codexReview.md

Include:
- summary of findings
- required fixes
- optional improvements
- tests added or recommended
- commands run
- validation outcomes
- merge-readiness opinion
