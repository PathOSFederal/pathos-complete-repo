# Incident Playbook: Worker Stuck / Lock Contention

## Trigger
- Worker runs repeatedly return blocked/skipped due to scheduler lock contention.

## Immediate Checks
1. Call `GET /health/ready` and inspect `lock_state_summary`.
2. Check recent worker run statuses and timestamps.
3. Verify only one worker scheduler process is active.

## Triage
1. Confirm lock TTL and current owner run id.
2. Wait for TTL expiry before manual intervention.
3. If lock is stale beyond TTL, clear lock row only with operator approval.

## Recovery
1. Resume worker with `WORKER_ENABLED=true`.
2. Verify a successful run after lock clears.
3. Confirm lock release events are present in logs.
