# Incident Playbook: Integrity Failure (Hash Mismatch)

## Trigger
- Export hash mismatch for expected-identical payloads, or upstream raw hash verification failure.

## Immediate Checks
1. Capture the reported hashes and timestamps.
2. Preserve request ids, run ids, and trace ids from structured logs.
3. Confirm whether payload inputs actually differ.

## Triage
1. Treat as high-signal trust-boundary incident.
2. Freeze destructive operations on affected records when possible.
3. Compare stored canonical payload and hash generation path.

## Recovery
1. Identify root cause (tampering, non-deterministic transformation, data corruption).
2. Correct deterministic pipeline boundary and re-run verification.
3. Document impact window and notify operators.
