# Backend Foundation Hardening

## What changed
- The backend now fails closed for API startup in non-local environments when auth is missing or obviously weak.
- Runtime environment handling is more explicit, including normalization of `PATHOS_ENV=PROD` to `production`.
- Placeholder runtime paths are now honest:
  - intelligence snapshot stub endpoints are local-only
  - future email delivery mode is local-only
- Minimal real deployment artifacts were added:
  - `.env.example`
  - `Dockerfile`
  - `compose.yaml`

## Why it matters
- This reduces the risk of the backend looking production-ready while still quietly running in an unsafe or incomplete mode.
- It gives later intelligence work a more stable base for auth, startup, and operations.
- It keeps local development practical without letting staging or production drift into weak default behavior.

## User and operator impact
- Local development still works without forcing a full auth stack redesign.
- Staging and production-shaped API startup now requires explicit API keys.
- Operators get clearer failures when environment configuration is invalid.
- Placeholder intelligence and email-delivery paths no longer masquerade as production-ready features outside local-style runtimes.

## Trust and safety impact
- Shared-key auth is still simple, but it is materially safer than before because non-local open mode is no longer allowed.
- Stub intelligence responses are now clearly limited to local-style environments.
- The backend is more honest about what is real, what is local-only, and what is intentionally not ready.

## Intentionally deferred
- This phase does not add a full user authn/authz model.
- This phase does not implement real external email delivery.
- This phase does not replace the intelligence snapshot stubs with real decision-engine modules.
