# Incident Playbook: Postgres Unavailable / Timeout

## Trigger
- Startup/readiness failures with DB unavailable or connection timeout errors.

## Immediate Checks
1. Verify DB host/port reachability from service runtime.
2. Validate credential injection and connection string format.
3. Check Postgres availability, pool saturation, and network policy changes.

## Triage
1. Confirm issue scope (single instance vs environment-wide).
2. Review recent deploy/config changes affecting DB access.
3. Keep worker paused if repeated failures threaten stability.

## Recovery
1. Restore DB availability/connectivity.
2. Run `GET /health/ready` and confirm `status=ready`.
3. Run `poetry run python scripts/ops/self_check.py` for a safe operational summary.
