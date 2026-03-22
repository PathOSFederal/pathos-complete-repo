# Schema Versioning Discipline

## Scope
All persistent schema changes must be represented as Alembic migrations under `alembic/versions/`.

## Migration Naming Rule
- File name format: `<YYYYMMDD>_<HHMMSS>_<short_description>.py`
- Use lowercase snake case for `<short_description>`.
- Keep one logical schema change per migration when possible.

## Required Checklist For Schema Changes
- Update SQLAlchemy models/repository schema usage first.
- Add a new Alembic migration in `alembic/versions/`.
- Run `alembic upgrade head` against a clean database.
- Validate both sqlite and postgres test paths (including contract tests).
- Include migration intent in PR notes.

## No Direct SQL Edits Rule
- Do not ship schema changes by editing runtime SQL or table definitions directly without a corresponding Alembic migration.
- Do not bypass migration history by manually mutating production schema outside Alembic.

## CI Enforcement
- CI runs a schema-discipline check script.
- If schema-relevant files changed and no Alembic migration file changed in the PR range, CI fails.
- Override is available only by explicit flag: `ALLOW_SCHEMA_CHANGE_WITHOUT_MIGRATION=true`.
