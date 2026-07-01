# Slice 86 Alembic/Postgres wiring (2026-02-23)

## Files Changed
- `app/core/config.py` - normalize Postgres SQLAlchemy URLs to `postgresql+psycopg://` so Alembic/SQLAlchemy always use psycopg v3.
- `alembic/env.py` - escape `%` in Alembic config to avoid ConfigParser interpolation crashes on URL-encoded passwords.
- `app/db/connection.py` - run Alembic migrations for Postgres in `init_db()` and set Alembic config with `%` escaping.
- `alembic/versions/20260222_000001_baseline_v1.py` - create baseline tables/indexes needed for Postgres tests (alert rules, scheduler locks, saved searches) to mirror sqlite schema.
- `tests/test_alembic_migrations.py` - accept `postgresql+psycopg://` URLs and normalize SQLAlchemy engine creation to psycopg v3.

## Change Notes (What/Why)
- `app/core/config.py`: normalize Postgres SQLAlchemy URLs so Alembic/SQLAlchemy never default to psycopg2 when the scheme is `postgresql://` or `postgres://`.
- `alembic/env.py`: escape `%` before passing the URL into Alembic's ConfigParser to avoid `ValueError: invalid interpolation syntax` on URL-encoded passwords.
- `app/db/connection.py`: route Postgres `init_db()` through Alembic upgrade head (sqlite runner remains for sqlite), and escape `%` when setting `sqlalchemy.url`.
- `alembic/versions/20260222_000001_baseline_v1.py`: build the minimum Postgres schema for alert rules + scheduler locks with parity columns from sqlite migrations so repo tests find required tables.
- `tests/test_alembic_migrations.py`: recognize `postgresql+psycopg://` URLs and force SQLAlchemy to use psycopg v3 in the optional Postgres test.

## Commands Run (Results)
- `poetry run alembic history`
  - Output: `<base> -> 20260222_000001 (head), Slice 86 baseline migration scaffold.`
- `poetry run alembic current`
  - Output: `20260222_000001 (head)`
- `poetry run alembic upgrade head`
  - Output: (no output)
- `poetry run pytest -q tests/test_alembic_migrations.py --cov=app --cov-fail-under=0`
  - Result: `2 passed in 2.20s`
- `poetry run pytest -q tests/db/repo/test_alert_rule_repo.py -k postgres --cov=app --cov-fail-under=0`
  - Result: `1 passed, 2 deselected in 3.29s`
\n## Slices 87-92 Run Start - 2026-02-23T13:03:38Z
\n### git status
On branch feature/slices-87-92-prod-hardening-sprint-v1
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   docs/merge-notes/current.md

no changes added to commit (use "git add" and/or "git commit -a")
\n### git branch --show-current
feature/slices-87-92-prod-hardening-sprint-v1
\n### git diff --name-status develop...HEAD
M	README.md
A	alembic.ini
A	alembic/env.py
A	alembic/script.py.mako
A	alembic/versions/20260222_000001_baseline_v1.py
M	app/core/config.py
M	app/db/connection.py
A	app/db/sqlalchemy_metadata.py
A	artifacts/slice-86-db-migrations-alembic-v1.name-status.txt
A	docs/merge-notes/current.md
A	merge-notes-slice-86.md
M	merge-notes.md
M	poetry.lock
M	pyproject.toml
A	tests/test_alembic_migrations.py
\n### git diff --stat develop...HEAD
 README.md                                          |   38 +-
 alembic.ini                                        |   39 +
 alembic/env.py                                     |   50 +
 alembic/script.py.mako                             |   26 +
 alembic/versions/20260222_000001_baseline_v1.py    |  121 ++
 app/core/config.py                                 |   28 +
 app/db/connection.py                               |   32 +-
 app/db/sqlalchemy_metadata.py                      |   11 +
 ...ice-86-db-migrations-alembic-v1.name-status.txt |    0
 docs/merge-notes/current.md                        |   27 +
 merge-notes-slice-86.md                            | 1085 ++++++++++++++++++
 merge-notes.md                                     | 1153 ++------------------
 poetry.lock                                        |  307 +++++-
 pyproject.toml                                     |    2 +
 tests/test_alembic_migrations.py                   |   65 ++
 15 files changed, 1892 insertions(+), 1092 deletions(-)
\n## After Step 1 (Slice 87) - 2026-02-23T13:07:28Z
\n### git status
On branch feature/slices-87-92-prod-hardening-sprint-v1
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   app/api/v1/health.py
	modified:   app/core/readiness.py
	modified:   app/db/connection.py
	modified:   app/db/migration_safety.py
	modified:   docs/merge-notes/current.md
	modified:   tests/test_health_readiness.py
	modified:   tests/test_migrations_runner.py

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	tests/test_migration_safety_slice87.py

no changes added to commit (use "git add" and/or "git commit -a")
\n### git branch --show-current
feature/slices-87-92-prod-hardening-sprint-v1
\n### git diff --name-status develop...HEAD
M	README.md
A	alembic.ini
A	alembic/env.py
A	alembic/script.py.mako
A	alembic/versions/20260222_000001_baseline_v1.py
M	app/core/config.py
M	app/db/connection.py
A	app/db/sqlalchemy_metadata.py
A	artifacts/slice-86-db-migrations-alembic-v1.name-status.txt
A	docs/merge-notes/current.md
A	merge-notes-slice-86.md
M	merge-notes.md
M	poetry.lock
M	pyproject.toml
A	tests/test_alembic_migrations.py
\n### git diff --stat develop...HEAD
 README.md                                          |   38 +-
 alembic.ini                                        |   39 +
 alembic/env.py                                     |   50 +
 alembic/script.py.mako                             |   26 +
 alembic/versions/20260222_000001_baseline_v1.py    |  121 ++
 app/core/config.py                                 |   28 +
 app/db/connection.py                               |   32 +-
 app/db/sqlalchemy_metadata.py                      |   11 +
 ...ice-86-db-migrations-alembic-v1.name-status.txt |    0
 docs/merge-notes/current.md                        |   27 +
 merge-notes-slice-86.md                            | 1085 ++++++++++++++++++
 merge-notes.md                                     | 1153 ++------------------
 poetry.lock                                        |  307 +++++-
 pyproject.toml                                     |    2 +
 tests/test_alembic_migrations.py                   |   65 ++
 15 files changed, 1892 insertions(+), 1092 deletions(-)
\n## After Step 2 (Slice 88) - 2026-02-23T13:10:44Z
\n### git status
On branch feature/slices-87-92-prod-hardening-sprint-v1
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   app/api/v1/health.py
	modified:   app/core/event_ids.py
	modified:   app/core/logging.py
	modified:   app/core/readiness.py
	modified:   app/core/request_context.py
	modified:   app/db/connection.py
	modified:   app/db/migration_safety.py
	modified:   app/services/alerts_run_service.py
	modified:   app/worker.py
	modified:   docs/merge-notes/current.md
	modified:   tests/test_health_readiness.py
	modified:   tests/test_log_event_registry_and_schema.py
	modified:   tests/test_logging_context.py
	modified:   tests/test_migrations_runner.py

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	tests/test_logging_hardening_slice88.py
	tests/test_migration_safety_slice87.py

no changes added to commit (use "git add" and/or "git commit -a")
\n### git branch --show-current
feature/slices-87-92-prod-hardening-sprint-v1
\n### git diff --name-status develop...HEAD
M	README.md
A	alembic.ini
A	alembic/env.py
A	alembic/script.py.mako
A	alembic/versions/20260222_000001_baseline_v1.py
M	app/core/config.py
M	app/db/connection.py
A	app/db/sqlalchemy_metadata.py
A	artifacts/slice-86-db-migrations-alembic-v1.name-status.txt
A	docs/merge-notes/current.md
A	merge-notes-slice-86.md
M	merge-notes.md
M	poetry.lock
M	pyproject.toml
A	tests/test_alembic_migrations.py
\n### git diff --stat develop...HEAD
 README.md                                          |   38 +-
 alembic.ini                                        |   39 +
 alembic/env.py                                     |   50 +
 alembic/script.py.mako                             |   26 +
 alembic/versions/20260222_000001_baseline_v1.py    |  121 ++
 app/core/config.py                                 |   28 +
 app/db/connection.py                               |   32 +-
 app/db/sqlalchemy_metadata.py                      |   11 +
 ...ice-86-db-migrations-alembic-v1.name-status.txt |    0
 docs/merge-notes/current.md                        |   27 +
 merge-notes-slice-86.md                            | 1085 ++++++++++++++++++
 merge-notes.md                                     | 1153 ++------------------
 poetry.lock                                        |  307 +++++-
 pyproject.toml                                     |    2 +
 tests/test_alembic_migrations.py                   |   65 ++
 15 files changed, 1892 insertions(+), 1092 deletions(-)
\n## After Step 3 (Slice 89) - 2026-02-23T13:13:23Z
\n### git status
On branch feature/slices-87-92-prod-hardening-sprint-v1
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   app/api/v1/health.py
	modified:   app/core/event_ids.py
	modified:   app/core/logging.py
	modified:   app/core/readiness.py
	modified:   app/core/request_context.py
	modified:   app/db/connection.py
	modified:   app/db/migration_safety.py
	modified:   app/db/repo/alert_rule_repo.py
	modified:   app/db/repo/saved_search_repo.py
	modified:   app/services/alerts_run_service.py
	modified:   app/worker.py
	modified:   docs/merge-notes/current.md
	modified:   tests/test_health_readiness.py
	modified:   tests/test_log_event_registry_and_schema.py
	modified:   tests/test_logging_context.py
	modified:   tests/test_migrations_runner.py

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	tests/db/repo/test_repository_contracts.py
	tests/test_logging_hardening_slice88.py
	tests/test_migration_safety_slice87.py

no changes added to commit (use "git add" and/or "git commit -a")
\n### git branch --show-current
feature/slices-87-92-prod-hardening-sprint-v1
\n### git diff --name-status develop...HEAD
M	README.md
A	alembic.ini
A	alembic/env.py
A	alembic/script.py.mako
A	alembic/versions/20260222_000001_baseline_v1.py
M	app/core/config.py
M	app/db/connection.py
A	app/db/sqlalchemy_metadata.py
A	artifacts/slice-86-db-migrations-alembic-v1.name-status.txt
A	docs/merge-notes/current.md
A	merge-notes-slice-86.md
M	merge-notes.md
M	poetry.lock
M	pyproject.toml
A	tests/test_alembic_migrations.py
\n### git diff --stat develop...HEAD
 README.md                                          |   38 +-
 alembic.ini                                        |   39 +
 alembic/env.py                                     |   50 +
 alembic/script.py.mako                             |   26 +
 alembic/versions/20260222_000001_baseline_v1.py    |  121 ++
 app/core/config.py                                 |   28 +
 app/db/connection.py                               |   32 +-
 app/db/sqlalchemy_metadata.py                      |   11 +
 ...ice-86-db-migrations-alembic-v1.name-status.txt |    0
 docs/merge-notes/current.md                        |   27 +
 merge-notes-slice-86.md                            | 1085 ++++++++++++++++++
 merge-notes.md                                     | 1153 ++------------------
 poetry.lock                                        |  307 +++++-
 pyproject.toml                                     |    2 +
 tests/test_alembic_migrations.py                   |   65 ++
 15 files changed, 1892 insertions(+), 1092 deletions(-)
\n## After Step 4 (Slice 90) - 2026-02-23T13:15:46Z
\n### git status
On branch feature/slices-87-92-prod-hardening-sprint-v1
Changes not staged for commit:
  (use "git add/rm <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   app/api/v1/health.py
	modified:   app/core/event_ids.py
	modified:   app/core/logging.py
	modified:   app/core/readiness.py
	modified:   app/core/request_context.py
	modified:   app/db/connection.py
	modified:   app/db/migration_safety.py
	modified:   app/db/repo/alert_rule_repo.py
	modified:   app/db/repo/saved_search_repo.py
	modified:   app/services/alerts_run_service.py
	deleted:    app/worker.py
	modified:   docs/merge-notes/current.md
	modified:   tests/test_health_readiness.py
	modified:   tests/test_log_event_registry_and_schema.py
	modified:   tests/test_logging_context.py
	modified:   tests/test_migrations_runner.py

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	app/worker/
	tests/db/repo/test_repository_contracts.py
	tests/test_logging_hardening_slice88.py
	tests/test_migration_safety_slice87.py
	tests/test_worker_scheduler_engine.py

no changes added to commit (use "git add" and/or "git commit -a")
\n### git branch --show-current
feature/slices-87-92-prod-hardening-sprint-v1
\n### git diff --name-status develop...HEAD
M	README.md
A	alembic.ini
A	alembic/env.py
A	alembic/script.py.mako
A	alembic/versions/20260222_000001_baseline_v1.py
M	app/core/config.py
M	app/db/connection.py
A	app/db/sqlalchemy_metadata.py
A	artifacts/slice-86-db-migrations-alembic-v1.name-status.txt
A	docs/merge-notes/current.md
A	merge-notes-slice-86.md
M	merge-notes.md
M	poetry.lock
M	pyproject.toml
A	tests/test_alembic_migrations.py
\n### git diff --stat develop...HEAD
 README.md                                          |   38 +-
 alembic.ini                                        |   39 +
 alembic/env.py                                     |   50 +
 alembic/script.py.mako                             |   26 +
 alembic/versions/20260222_000001_baseline_v1.py    |  121 ++
 app/core/config.py                                 |   28 +
 app/db/connection.py                               |   32 +-
 app/db/sqlalchemy_metadata.py                      |   11 +
 ...ice-86-db-migrations-alembic-v1.name-status.txt |    0
 docs/merge-notes/current.md                        |   27 +
 merge-notes-slice-86.md                            | 1085 ++++++++++++++++++
 merge-notes.md                                     | 1153 ++------------------
 poetry.lock                                        |  307 +++++-
 pyproject.toml                                     |    2 +
 tests/test_alembic_migrations.py                   |   65 ++
 15 files changed, 1892 insertions(+), 1092 deletions(-)
\n## After Step 5 (Slice 91) - 2026-02-23T13:16:28Z
\n### git status
On branch feature/slices-87-92-prod-hardening-sprint-v1
Changes not staged for commit:
  (use "git add/rm <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   .github/workflows/ci.yml
	modified:   app/api/v1/health.py
	modified:   app/core/event_ids.py
	modified:   app/core/logging.py
	modified:   app/core/readiness.py
	modified:   app/core/request_context.py
	modified:   app/db/connection.py
	modified:   app/db/migration_safety.py
	modified:   app/db/repo/alert_rule_repo.py
	modified:   app/db/repo/saved_search_repo.py
	modified:   app/services/alerts_run_service.py
	deleted:    app/worker.py
	modified:   docs/merge-notes/current.md
	modified:   tests/test_health_readiness.py
	modified:   tests/test_log_event_registry_and_schema.py
	modified:   tests/test_logging_context.py
	modified:   tests/test_migrations_runner.py

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	app/worker/
	tests/db/repo/test_repository_contracts.py
	tests/test_logging_hardening_slice88.py
	tests/test_migration_safety_slice87.py
	tests/test_worker_scheduler_engine.py

no changes added to commit (use "git add" and/or "git commit -a")
\n### git branch --show-current
feature/slices-87-92-prod-hardening-sprint-v1
\n### git diff --name-status develop...HEAD
M	README.md
A	alembic.ini
A	alembic/env.py
A	alembic/script.py.mako
A	alembic/versions/20260222_000001_baseline_v1.py
M	app/core/config.py
M	app/db/connection.py
A	app/db/sqlalchemy_metadata.py
A	artifacts/slice-86-db-migrations-alembic-v1.name-status.txt
A	docs/merge-notes/current.md
A	merge-notes-slice-86.md
M	merge-notes.md
M	poetry.lock
M	pyproject.toml
A	tests/test_alembic_migrations.py
\n### git diff --stat develop...HEAD
 README.md                                          |   38 +-
 alembic.ini                                        |   39 +
 alembic/env.py                                     |   50 +
 alembic/script.py.mako                             |   26 +
 alembic/versions/20260222_000001_baseline_v1.py    |  121 ++
 app/core/config.py                                 |   28 +
 app/db/connection.py                               |   32 +-
 app/db/sqlalchemy_metadata.py                      |   11 +
 ...ice-86-db-migrations-alembic-v1.name-status.txt |    0
 docs/merge-notes/current.md                        |   27 +
 merge-notes-slice-86.md                            | 1085 ++++++++++++++++++
 merge-notes.md                                     | 1153 ++------------------
 poetry.lock                                        |  307 +++++-
 pyproject.toml                                     |    2 +
 tests/test_alembic_migrations.py                   |   65 ++
 15 files changed, 1892 insertions(+), 1092 deletions(-)
\n## After Step 6 (Slice 92) - 2026-02-23T13:17:19Z
\n### git status
On branch feature/slices-87-92-prod-hardening-sprint-v1
Changes not staged for commit:
  (use "git add/rm <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   .github/workflows/ci.yml
	modified:   app/api/v1/health.py
	modified:   app/core/event_ids.py
	modified:   app/core/logging.py
	modified:   app/core/readiness.py
	modified:   app/core/request_context.py
	modified:   app/db/connection.py
	modified:   app/db/migration_safety.py
	modified:   app/db/repo/alert_rule_repo.py
	modified:   app/db/repo/saved_search_repo.py
	modified:   app/services/alerts_run_service.py
	deleted:    app/worker.py
	modified:   docs/merge-notes/current.md
	modified:   tests/test_health_readiness.py
	modified:   tests/test_log_event_registry_and_schema.py
	modified:   tests/test_logging_context.py
	modified:   tests/test_migrations_runner.py

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	app/worker/
	docs/schema-versioning-discipline.md
	scripts/ci/
	tests/db/repo/test_repository_contracts.py
	tests/test_logging_hardening_slice88.py
	tests/test_migration_safety_slice87.py
	tests/test_worker_scheduler_engine.py

no changes added to commit (use "git add" and/or "git commit -a")
\n### git branch --show-current
feature/slices-87-92-prod-hardening-sprint-v1
\n### git diff --name-status develop...HEAD
M	README.md
A	alembic.ini
A	alembic/env.py
A	alembic/script.py.mako
A	alembic/versions/20260222_000001_baseline_v1.py
M	app/core/config.py
M	app/db/connection.py
A	app/db/sqlalchemy_metadata.py
A	artifacts/slice-86-db-migrations-alembic-v1.name-status.txt
A	docs/merge-notes/current.md
A	merge-notes-slice-86.md
M	merge-notes.md
M	poetry.lock
M	pyproject.toml
A	tests/test_alembic_migrations.py
\n### git diff --stat develop...HEAD
 README.md                                          |   38 +-
 alembic.ini                                        |   39 +
 alembic/env.py                                     |   50 +
 alembic/script.py.mako                             |   26 +
 alembic/versions/20260222_000001_baseline_v1.py    |  121 ++
 app/core/config.py                                 |   28 +
 app/db/connection.py                               |   32 +-
 app/db/sqlalchemy_metadata.py                      |   11 +
 ...ice-86-db-migrations-alembic-v1.name-status.txt |    0
 docs/merge-notes/current.md                        |   27 +
 merge-notes-slice-86.md                            | 1085 ++++++++++++++++++
 merge-notes.md                                     | 1153 ++------------------
 poetry.lock                                        |  307 +++++-
 pyproject.toml                                     |    2 +
 tests/test_alembic_migrations.py                   |   65 ++
 15 files changed, 1892 insertions(+), 1092 deletions(-)
\n## Final State After Slices 87-92 - 2026-02-23T13:17:31Z
\n### git status
On branch feature/slices-87-92-prod-hardening-sprint-v1
Changes not staged for commit:
  (use "git add/rm <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   .github/workflows/ci.yml
	modified:   app/api/v1/health.py
	modified:   app/core/event_ids.py
	modified:   app/core/logging.py
	modified:   app/core/readiness.py
	modified:   app/core/request_context.py
	modified:   app/db/connection.py
	modified:   app/db/migration_safety.py
	modified:   app/db/repo/alert_rule_repo.py
	modified:   app/db/repo/saved_search_repo.py
	modified:   app/services/alerts_run_service.py
	deleted:    app/worker.py
	modified:   docs/merge-notes/current.md
	modified:   tests/test_health_readiness.py
	modified:   tests/test_log_event_registry_and_schema.py
	modified:   tests/test_logging_context.py
	modified:   tests/test_migrations_runner.py

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	app/worker/
	docs/schema-versioning-discipline.md
	scripts/ci/
	tests/db/repo/test_repository_contracts.py
	tests/test_logging_hardening_slice88.py
	tests/test_migration_safety_slice87.py
	tests/test_worker_scheduler_engine.py

no changes added to commit (use "git add" and/or "git commit -a")
\n### git branch --show-current
feature/slices-87-92-prod-hardening-sprint-v1
\n### git diff --name-status develop...HEAD
M	README.md
A	alembic.ini
A	alembic/env.py
A	alembic/script.py.mako
A	alembic/versions/20260222_000001_baseline_v1.py
M	app/core/config.py
M	app/db/connection.py
A	app/db/sqlalchemy_metadata.py
A	artifacts/slice-86-db-migrations-alembic-v1.name-status.txt
A	docs/merge-notes/current.md
A	merge-notes-slice-86.md
M	merge-notes.md
M	poetry.lock
M	pyproject.toml
A	tests/test_alembic_migrations.py
\n### git diff --stat develop...HEAD
 README.md                                          |   38 +-
 alembic.ini                                        |   39 +
 alembic/env.py                                     |   50 +
 alembic/script.py.mako                             |   26 +
 alembic/versions/20260222_000001_baseline_v1.py    |  121 ++
 app/core/config.py                                 |   28 +
 app/db/connection.py                               |   32 +-
 app/db/sqlalchemy_metadata.py                      |   11 +
 ...ice-86-db-migrations-alembic-v1.name-status.txt |    0
 docs/merge-notes/current.md                        |   27 +
 merge-notes-slice-86.md                            | 1085 ++++++++++++++++++
 merge-notes.md                                     | 1153 ++------------------
 poetry.lock                                        |  307 +++++-
 pyproject.toml                                     |    2 +
 tests/test_alembic_migrations.py                   |   65 ++
 15 files changed, 1892 insertions(+), 1092 deletions(-)
\n### Rename Note
Unavoidable rename performed once for Slice 90: app/worker.py -> app/worker/__init__.py to support app/worker/scheduler_engine.py package path requirement.
\n## Ruff enforcement hardening - 2026-02-23T13:23:46Z
\n### Note
Documented only (not executed): pre-commit install
\n### git status
On branch feature/slices-87-92-prod-hardening-sprint-v1
Changes not staged for commit:
  (use "git add/rm <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   .github/workflows/ci.yml
	modified:   app/api/v1/health.py
	modified:   app/core/event_ids.py
	modified:   app/core/logging.py
	modified:   app/core/readiness.py
	modified:   app/core/request_context.py
	modified:   app/db/connection.py
	modified:   app/db/migration_safety.py
	modified:   app/db/repo/alert_rule_repo.py
	modified:   app/db/repo/saved_search_repo.py
	modified:   app/services/alerts_run_service.py
	deleted:    app/worker.py
	modified:   docs/merge-notes/current.md
	modified:   poetry.lock
	modified:   pyproject.toml
	modified:   tests/test_health_readiness.py
	modified:   tests/test_log_event_registry_and_schema.py
	modified:   tests/test_logging_context.py
	modified:   tests/test_migrations_runner.py

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	.pre-commit-config.yaml
	app/worker/
	docs/schema-versioning-discipline.md
	scripts/ci/
	tests/db/repo/test_repository_contracts.py
	tests/test_logging_hardening_slice88.py
	tests/test_migration_safety_slice87.py
	tests/test_worker_scheduler_engine.py

no changes added to commit (use "git add" and/or "git commit -a")
\n### git branch --show-current
feature/slices-87-92-prod-hardening-sprint-v1
\n### git diff --name-status develop...HEAD
M	README.md
A	alembic.ini
A	alembic/env.py
A	alembic/script.py.mako
A	alembic/versions/20260222_000001_baseline_v1.py
M	app/core/config.py
M	app/db/connection.py
A	app/db/sqlalchemy_metadata.py
A	artifacts/slice-86-db-migrations-alembic-v1.name-status.txt
A	docs/merge-notes/current.md
A	merge-notes-slice-86.md
M	merge-notes.md
M	poetry.lock
M	pyproject.toml
A	tests/test_alembic_migrations.py
\n### git diff --stat develop...HEAD
 README.md                                          |   38 +-
 alembic.ini                                        |   39 +
 alembic/env.py                                     |   50 +
 alembic/script.py.mako                             |   26 +
 alembic/versions/20260222_000001_baseline_v1.py    |  121 ++
 app/core/config.py                                 |   28 +
 app/db/connection.py                               |   32 +-
 app/db/sqlalchemy_metadata.py                      |   11 +
 ...ice-86-db-migrations-alembic-v1.name-status.txt |    0
 docs/merge-notes/current.md                        |   27 +
 merge-notes-slice-86.md                            | 1085 ++++++++++++++++++
 merge-notes.md                                     | 1153 ++------------------
 poetry.lock                                        |  307 +++++-
 pyproject.toml                                     |    2 +
 tests/test_alembic_migrations.py                   |   65 ++
 15 files changed, 1892 insertions(+), 1092 deletions(-)
\n### poetry run ruff check scripts/ci/check_schema_migration_discipline.py
All checks passed!
\n### poetry run ruff check .
All checks passed!
\n### poetry run ruff format --check .
Would reformat: alembic/env.py
Would reformat: alembic/versions/20260222_000001_baseline_v1.py
Would reformat: app/adapters/usajobs/client.py
Would reformat: app/adapters/usajobs/errors.py
Would reformat: app/adapters/usajobs/models.py
Would reformat: app/adapters/usajobs/normalize.py
Would reformat: app/adapters/usajobs/types.py
Would reformat: app/api/v1/advisor.py
Would reformat: app/api/v1/advisor_session.py
Would reformat: app/api/v1/alerts.py
Would reformat: app/api/v1/desktop.py
Would reformat: app/api/v1/health.py
Would reformat: app/api/v1/jobs.py
Would reformat: app/api/v1/saved_searches.py
Would reformat: app/api/v1/thread_summary.py
Would reformat: app/api/v1/threads.py
Would reformat: app/api/v1/wipe.py
Would reformat: app/contracts/error_contract.py
Would reformat: app/core/config.py
Would reformat: app/core/error_handlers.py
Would reformat: app/core/logging.py
Would reformat: app/core/request_context.py
Would reformat: app/core/startup_validation.py
Would reformat: app/db/connection.py
Would reformat: app/db/migration_safety.py
Would reformat: app/db/migrations/runner.py
Would reformat: app/db/repo/advisor_session_repo.py
Would reformat: app/db/repo/alert_delivery_log_repo.py
Would reformat: app/db/repo/alert_digest_repo.py
Would reformat: app/db/repo/alert_repo.py
Would reformat: app/db/repo/alert_rule_repo.py
Would reformat: app/db/repo/alert_rule_run_repo.py
Would reformat: app/db/repo/alert_run_repo.py
Would reformat: app/db/repo/alert_scheduler_lock_repo.py
Would reformat: app/db/repo/audit_repo.py
Would reformat: app/db/repo/profile_repo.py
Would reformat: app/db/repo/saved_search_repo.py
Would reformat: app/db/repo/saved_search_snapshot_repo.py
Would reformat: app/db/repo/thread_repo.py
Would reformat: app/db/sqlalchemy_metadata.py
Would reformat: app/domain/jobs/__init__.py
Would reformat: app/engine/evaluator.py
Would reformat: app/engine/reason_library.py
Would reformat: app/engine/scoring.py
Would reformat: app/engine/thread_summary_v1.py
Would reformat: app/llm/client.py
Would reformat: app/llm/narrator.py
Would reformat: app/llm/redaction.py
Would reformat: app/llm/schemas.py
Would reformat: app/llm/thread_summarizer.py
Would reformat: app/main.py
Would reformat: app/middleware/rate_limit.py
Would reformat: app/middleware/request_id.py
Would reformat: app/models/__init__.py
Would reformat: app/models/advisor_session.py
Would reformat: app/models/alert_rule.py
Would reformat: app/models/common.py
Would reformat: app/models/job.py
Would reformat: app/models/job_score.py
Would reformat: app/models/job_search.py
Would reformat: app/models/profile.py
Would reformat: app/models/profile_v1.py
Would reformat: app/services/advisor_service.py
Would reformat: app/services/advisor_session_service.py
Would reformat: app/services/alert_digest_service.py
Would reformat: app/services/alert_evaluator.py
Would reformat: app/services/alert_rule_service.py
Would reformat: app/services/alert_service.py
Would reformat: app/services/alerts_run_service.py
Would reformat: app/services/audit_service.py
Would reformat: app/services/delivery_transport_service.py
Would reformat: app/services/delta_engine_service.py
Would reformat: app/services/digest_builder_service.py
Would reformat: app/services/export_service.py
Would reformat: app/services/job_scoring_service.py
Would reformat: app/services/job_search_service.py
Would reformat: app/services/narration_service.py
Would reformat: app/services/profile_service.py
Would reformat: app/services/saved_search_checkpoint_service.py
Would reformat: app/services/saved_search_runner_service.py
Would reformat: app/services/saved_search_service.py
Would reformat: app/services/thread_service.py
Would reformat: app/services/usajobs_diagnostics_service.py
Would reformat: app/services/wipe_service.py
Would reformat: app/worker/__init__.py
Would reformat: app/worker/scheduler_engine.py
Would reformat: scripts/ci/check_schema_migration_discipline.py
Would reformat: scripts/ci_ai/autofix_patch.py
Would reformat: scripts/ci_ai/pr_review.py
Would reformat: scripts/export_openapi.py
Would reformat: tests/adapters/usajobs/test_mapper.py
Would reformat: tests/api/advisor_session/test__categories__advisor_session.py
Would reformat: tests/api/alerts/test__categories__alerts.py
Would reformat: tests/api/alerts/test__categories__alerts_observability_v1.py
Would reformat: tests/api/alerts/test__categories__alerts_run_v1.py
Would reformat: tests/api/diagnostics/test__categories__usajobs_diagnostics.py
Would reformat: tests/api/jobs/test__categories__job_score.py
Would reformat: tests/api/jobs/test__categories__jobs_search.py
Would reformat: tests/api/jobs/test__equivalence__job_search_service.py
Would reformat: tests/api/jobs/test__missing_usajobs_key_returns_config_error.py
Would reformat: tests/api/jobs/test__positive__normalize.py
Would reformat: tests/api/profile/test__categories__profile.py
Would reformat: tests/api/saved_searches/test__categories__saved_searches.py
Would reformat: tests/boundary/test_boundary_testing_hardening_v1.py
Would reformat: tests/conftest.py
Would reformat: tests/db/repo/test_alert_rule_repo.py
Would reformat: tests/db/repo/test_alert_scheduler_lock_repo.py
Would reformat: tests/db/repo/test_repository_contracts.py
Would reformat: tests/edge_case/test_edge_case_testing_hardening_v1.py
Would reformat: tests/integration/test_jobs_search.py
Would reformat: tests/misuse_case/test_misuse_case_testing_hardening_v1.py
Would reformat: tests/negative/test_negative_testing_hardening_v1.py
Would reformat: tests/positive/test_positive_testing_hardening_v1.py
Would reformat: tests/services/test_alert_evaluator.py
Would reformat: tests/services/test_delivery_transport_service.py
Would reformat: tests/services/test_delta_engine_service.py
Would reformat: tests/services/test_digest_builder_service.py
Would reformat: tests/services/test_job_scoring_service.py
Would reformat: tests/services/test_saved_search_checkpoint_service.py
Would reformat: tests/services/test_saved_search_runner_service.py
Would reformat: tests/test_advisor_engine_golden.py
Would reformat: tests/test_advisor_writes_audit.py
Would reformat: tests/test_alembic_migrations.py
Would reformat: tests/test_audit_repo.py
Would reformat: tests/test_auth.py
Would reformat: tests/test_category_boundary_security.py
Would reformat: tests/test_db_postgres_helpers.py
Would reformat: tests/test_delete_audit.py
Would reformat: tests/test_delete_thread_cascades_messages.py
Would reformat: tests/test_desktop_contract_cors.py
Would reformat: tests/test_error_contract_observability.py
Would reformat: tests/test_evaluate_and_narrate_contract.py
Would reformat: tests/test_export_and_desktop_contracts.py
Would reformat: tests/test_export_thread_includes_linked_audits.py
Would reformat: tests/test_health_readiness.py
Would reformat: tests/test_import_safe_app_factory.py
Would reformat: tests/test_llm_client.py
Would reformat: tests/test_llm_schemas.py
Would reformat: tests/test_log_event_registry_and_schema.py
Would reformat: tests/test_logging_context.py
Would reformat: tests/test_main_import_side_effects.py
Would reformat: tests/test_meta_openapi.py
Would reformat: tests/test_migrations_runner.py
Would reformat: tests/test_models_validate.py
Would reformat: tests/test_narration_audit_attach.py
Would reformat: tests/test_narration_fallback.py
Would reformat: tests/test_narration_schema_validation.py
Would reformat: tests/test_openapi_snapshot_regression.py
Would reformat: tests/test_rate_limit.py
Would reformat: tests/test_request_completion_logging.py
Would reformat: tests/test_thread_messages_store_toggle.py
Would reformat: tests/test_thread_summary_deterministic.py
Would reformat: tests/test_thread_summary_llm_fallback.py
Would reformat: tests/test_thread_summary_opt_in_enforced.py
Would reformat: tests/test_thread_summary_updates_on_message.py
Would reformat: tests/test_thread_trace_linking.py
Would reformat: tests/test_threads_opt_in.py
Would reformat: tests/test_wipe_requires_confirm.py
Would reformat: tests/test_worker_alerts.py
Would reformat: tests/test_worker_scheduler_engine.py
Would reformat: tests/use_case/test_use_case_testing_hardening_v1.py
161 files would be reformatted, 43 files already formatted
\n## Ruff changed-files format gate update - 2026-02-23T13:29:16Z
\n### git status
On branch feature/slices-87-92-prod-hardening-sprint-v1
Changes not staged for commit:
  (use "git add/rm <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   .github/workflows/ci.yml
	modified:   app/api/v1/health.py
	modified:   app/core/event_ids.py
	modified:   app/core/logging.py
	modified:   app/core/readiness.py
	modified:   app/core/request_context.py
	modified:   app/db/connection.py
	modified:   app/db/migration_safety.py
	modified:   app/db/repo/alert_rule_repo.py
	modified:   app/db/repo/saved_search_repo.py
	modified:   app/services/alerts_run_service.py
	deleted:    app/worker.py
	modified:   docs/merge-notes/current.md
	modified:   poetry.lock
	modified:   pyproject.toml
	modified:   tests/test_health_readiness.py
	modified:   tests/test_log_event_registry_and_schema.py
	modified:   tests/test_logging_context.py
	modified:   tests/test_migrations_runner.py

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	.pre-commit-config.yaml
	app/worker/
	docs/schema-versioning-discipline.md
	scripts/ci/
	tests/db/repo/test_repository_contracts.py
	tests/test_logging_hardening_slice88.py
	tests/test_migration_safety_slice87.py
	tests/test_worker_scheduler_engine.py

no changes added to commit (use "git add" and/or "git commit -a")
\n### git branch --show-current
feature/slices-87-92-prod-hardening-sprint-v1
\n### git diff --name-status develop...HEAD
M	README.md
A	alembic.ini
A	alembic/env.py
A	alembic/script.py.mako
A	alembic/versions/20260222_000001_baseline_v1.py
M	app/core/config.py
M	app/db/connection.py
A	app/db/sqlalchemy_metadata.py
A	artifacts/slice-86-db-migrations-alembic-v1.name-status.txt
A	docs/merge-notes/current.md
A	merge-notes-slice-86.md
M	merge-notes.md
M	poetry.lock
M	pyproject.toml
A	tests/test_alembic_migrations.py
\n### git diff --stat develop...HEAD
 README.md                                          |   38 +-
 alembic.ini                                        |   39 +
 alembic/env.py                                     |   50 +
 alembic/script.py.mako                             |   26 +
 alembic/versions/20260222_000001_baseline_v1.py    |  121 ++
 app/core/config.py                                 |   28 +
 app/db/connection.py                               |   32 +-
 app/db/sqlalchemy_metadata.py                      |   11 +
 ...ice-86-db-migrations-alembic-v1.name-status.txt |    0
 docs/merge-notes/current.md                        |   27 +
 merge-notes-slice-86.md                            | 1085 ++++++++++++++++++
 merge-notes.md                                     | 1153 ++------------------
 poetry.lock                                        |  307 +++++-
 pyproject.toml                                     |    2 +
 tests/test_alembic_migrations.py                   |   65 ++
 15 files changed, 1892 insertions(+), 1092 deletions(-)
\n### poetry run python scripts/ci/ruff_format_check_changed.py
Would reformat: alembic/env.py
Would reformat: alembic/versions/20260222_000001_baseline_v1.py
Would reformat: app/core/config.py
Would reformat: app/db/connection.py
Would reformat: app/db/sqlalchemy_metadata.py
Would reformat: tests/test_alembic_migrations.py
6 files would be reformatted
Ruff format changed-files check base ref: develop
Changed Python files to check:
 - alembic/env.py
 - alembic/versions/20260222_000001_baseline_v1.py
 - app/core/config.py
 - app/db/connection.py
 - app/db/sqlalchemy_metadata.py
 - tests/test_alembic_migrations.py
Running: ruff format --check alembic/env.py alembic/versions/20260222_000001_baseline_v1.py app/core/config.py app/db/connection.py app/db/sqlalchemy_metadata.py tests/test_alembic_migrations.py
\n## Ruff changed-files format gate update (final) - 2026-02-23T13:29:43Z
\n### git status
On branch feature/slices-87-92-prod-hardening-sprint-v1
Changes not staged for commit:
  (use "git add/rm <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   .github/workflows/ci.yml
	modified:   app/api/v1/health.py
	modified:   app/core/event_ids.py
	modified:   app/core/logging.py
	modified:   app/core/readiness.py
	modified:   app/core/request_context.py
	modified:   app/db/connection.py
	modified:   app/db/migration_safety.py
	modified:   app/db/repo/alert_rule_repo.py
	modified:   app/db/repo/saved_search_repo.py
	modified:   app/services/alerts_run_service.py
	deleted:    app/worker.py
	modified:   docs/merge-notes/current.md
	modified:   poetry.lock
	modified:   pyproject.toml
	modified:   tests/test_health_readiness.py
	modified:   tests/test_log_event_registry_and_schema.py
	modified:   tests/test_logging_context.py
	modified:   tests/test_migrations_runner.py

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	.pre-commit-config.yaml
	app/worker/
	docs/schema-versioning-discipline.md
	scripts/ci/
	tests/db/repo/test_repository_contracts.py
	tests/test_logging_hardening_slice88.py
	tests/test_migration_safety_slice87.py
	tests/test_worker_scheduler_engine.py

no changes added to commit (use "git add" and/or "git commit -a")
\n### git branch --show-current
feature/slices-87-92-prod-hardening-sprint-v1
\n### git diff --name-status develop...HEAD
M	README.md
A	alembic.ini
A	alembic/env.py
A	alembic/script.py.mako
A	alembic/versions/20260222_000001_baseline_v1.py
M	app/core/config.py
M	app/db/connection.py
A	app/db/sqlalchemy_metadata.py
A	artifacts/slice-86-db-migrations-alembic-v1.name-status.txt
A	docs/merge-notes/current.md
A	merge-notes-slice-86.md
M	merge-notes.md
M	poetry.lock
M	pyproject.toml
A	tests/test_alembic_migrations.py
\n### git diff --stat develop...HEAD
 README.md                                          |   38 +-
 alembic.ini                                        |   39 +
 alembic/env.py                                     |   50 +
 alembic/script.py.mako                             |   26 +
 alembic/versions/20260222_000001_baseline_v1.py    |  121 ++
 app/core/config.py                                 |   28 +
 app/db/connection.py                               |   32 +-
 app/db/sqlalchemy_metadata.py                      |   11 +
 ...ice-86-db-migrations-alembic-v1.name-status.txt |    0
 docs/merge-notes/current.md                        |   27 +
 merge-notes-slice-86.md                            | 1085 ++++++++++++++++++
 merge-notes.md                                     | 1153 ++------------------
 poetry.lock                                        |  307 +++++-
 pyproject.toml                                     |    2 +
 tests/test_alembic_migrations.py                   |   65 ++
 15 files changed, 1892 insertions(+), 1092 deletions(-)
\n### poetry run ruff check scripts/ci/ruff_format_check_changed.py
All checks passed!
\n### poetry run python scripts/ci/ruff_format_check_changed.py
Ruff format changed-files check base ref: develop
Changed Python files to check:
 - alembic/env.py
 - alembic/versions/20260222_000001_baseline_v1.py
 - app/core/config.py
 - app/db/connection.py
 - app/db/sqlalchemy_metadata.py
 - tests/test_alembic_migrations.py
Running: ruff format --check alembic/env.py alembic/versions/20260222_000001_baseline_v1.py app/core/config.py app/db/connection.py app/db/sqlalchemy_metadata.py tests/test_alembic_migrations.py
Would reformat: alembic/env.py
Would reformat: alembic/versions/20260222_000001_baseline_v1.py
Would reformat: app/core/config.py
Would reformat: app/db/connection.py
Would reformat: app/db/sqlalchemy_metadata.py
Would reformat: tests/test_alembic_migrations.py
6 files would be reformatted

### git status
On branch feature/slices-87-92-prod-hardening-sprint-v1
Changes not staged for commit:
  (use "git add/rm <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   .github/workflows/ci.yml
	modified:   app/api/v1/health.py
	modified:   app/core/event_ids.py
	modified:   app/core/logging.py
	modified:   app/core/readiness.py
	modified:   app/core/request_context.py
	modified:   app/db/connection.py
	modified:   app/db/migration_safety.py
	modified:   app/db/repo/alert_rule_repo.py
	modified:   app/db/repo/saved_search_repo.py
	modified:   app/services/alerts_run_service.py
	deleted:    app/worker.py
	modified:   docs/merge-notes/current.md
	modified:   poetry.lock
	modified:   pyproject.toml
	modified:   tests/test_health_readiness.py
	modified:   tests/test_log_event_registry_and_schema.py
	modified:   tests/test_logging_context.py
	modified:   tests/test_migrations_runner.py

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	.pre-commit-config.yaml
	app/worker/
	docs/schema-versioning-discipline.md
	scripts/ci/
	tests/db/repo/test_repository_contracts.py
	tests/test_logging_hardening_slice88.py
	tests/test_migration_safety_slice87.py
	tests/test_worker_scheduler_engine.py

no changes added to commit (use "git add" and/or "git commit -a")

### git branch --show-current
feature/slices-87-92-prod-hardening-sprint-v1

### git diff --name-status develop...HEAD
M	README.md
A	alembic.ini
A	alembic/env.py
A	alembic/script.py.mako
A	alembic/versions/20260222_000001_baseline_v1.py
M	app/core/config.py
M	app/db/connection.py
A	app/db/sqlalchemy_metadata.py
A	artifacts/slice-86-db-migrations-alembic-v1.name-status.txt
A	docs/merge-notes/current.md
A	merge-notes-slice-86.md
M	merge-notes.md
M	poetry.lock
M	pyproject.toml
A	tests/test_alembic_migrations.py

### git diff --stat develop...HEAD
 README.md                                          |   38 +-
 alembic.ini                                        |   39 +
 alembic/env.py                                     |   50 +
 alembic/script.py.mako                             |   26 +
 alembic/versions/20260222_000001_baseline_v1.py    |  121 ++
 app/core/config.py                                 |   28 +
 app/db/connection.py                               |   32 +-
 app/db/sqlalchemy_metadata.py                      |   11 +
 ...ice-86-db-migrations-alembic-v1.name-status.txt |    0
 docs/merge-notes/current.md                        |   27 +
 merge-notes-slice-86.md                            | 1085 ++++++++++++++++++
 merge-notes.md                                     | 1153 ++------------------
 poetry.lock                                        |  307 +++++-
 pyproject.toml                                     |    2 +
 tests/test_alembic_migrations.py                   |   65 ++
 15 files changed, 1892 insertions(+), 1092 deletions(-)

### poetry run pytest -q tests/test_migration_safety_slice87.py::test_init_db_dev_warns_on_migration_mismatch
.
ERROR: Coverage failure: total of 9 is less than fail-under=90
                                                                         [100%]
================================ tests coverage ================================
_______________ coverage: platform linux, python 3.12.12-final-0 _______________

Name                                          Stmts   Miss Branch BrPart  Cover   Missing
-----------------------------------------------------------------------------------------
app/__init__.py                                   0      0      0      0   100%
app/adapters/__init__.py                          0      0      0      0   100%
app/adapters/usajobs/__init__.py                  0      0      0      0   100%
app/adapters/usajobs/client.py                   59     59     14      0     0%   16-130
app/adapters/usajobs/errors.py                    7      7      0      0     0%   16-39
app/adapters/usajobs/mapper.py                    6      6      0      0     0%   16-26
app/adapters/usajobs/models.py                   34     34      0      0     0%   15-81
app/adapters/usajobs/normalize.py                60     60     30      0     0%   16-133
app/adapters/usajobs/types.py                    15     15      0      0     0%   15-38
app/api/__init__.py                               0      0      0      0   100%
app/api/v1/__init__.py                            0      0      0      0   100%
app/api/v1/advisor.py                            33     33      0      0     0%   1-49
app/api/v1/advisor_session.py                    31     31      0      0     0%   14-73
app/api/v1/alerts.py                            129    129      8      0     0%   13-205
app/api/v1/audit.py                              19     19      0      0     0%   1-27
app/api/v1/desktop.py                            36     36      0      0     0%   1-67
app/api/v1/diagnostics.py                        15     15      4      0     0%   3-22
app/api/v1/export.py                             21     21      0      0     0%   1-30
app/api/v1/health.py                             46     46      6      0     0%   1-130
app/api/v1/jobs.py                               57     57      2      0     0%   15-177
app/api/v1/meta.py                                5      5      0      0     0%   1-8
app/api/v1/profile_v1.py                         14     14      0      0     0%   13-37
app/api/v1/saved_searches.py                     30     30      0      0     0%   14-66
app/api/v1/thread_summary.py                     22     22      0      0     0%   1-36
app/api/v1/threads.py                            48     48      0      0     0%   1-76
app/api/v1/wipe.py                               14     14      2      0     0%   1-21
app/contracts/__init__.py                         2      2      0      0     0%   1-3
app/contracts/desktop_contract.py                10     10      0      0     0%   1-15
app/contracts/error_contract.py                  14     14      0      0     0%   1-20
app/core/__init__.py                              3      0      0      0   100%
app/core/config.py                              186     85     32      4    50%   30-36, 41-47, 119-122, 152, 158, 162, 187-188, 193-198, 203-208, 219-220, 225-226, 231-232, 237-238, 243-244, 249-250, 255-256, 261-262, 267-268, 273-274, 279-280, 285-286, 291-292, 297-298, 303-304, 309-310, 321-322, 327-333, 338-348
app/core/error_codes.py                          26     26      8      0     0%   3-128
app/core/error_handlers.py                       60     60      6      0     0%   1-134
app/core/event_ids.py                             2      0      0      0   100%
app/core/logging.py                              40     21      6      1    43%   22-34, 38-57, 74
app/core/readiness.py                            19     19      2      0     0%   3-35
app/core/request_context.py                      33     10      0      0    70%   15, 23, 31, 39, 47, 55-59
app/core/security.py                             16     12     10      0    15%   9-22
app/core/startup_validation.py                   35     35     18      0     0%   3-73
app/db/__init__.py                                2      0      0      0   100%
app/db/connection.py                            154     68     42     13    51%   32-50, 54, 59, 64-70, 75-83, 95, 101, 104-107, 110-111, 114, 117, 120-121, 124, 128-143, 148, 157-165, 180-188, 189->exit, 209-212, 232, 234, 236, 239->241, 241->243, 243->245, 261, 263
app/db/migration_safety.py                       73     48     24      0    26%   40-56, 60-69, 73-75, 88-118
app/db/migrations/__init__.py                     2      0      0      0   100%
app/db/migrations/runner.py                     106     68     36      2    30%   27-45, 49, 53-61, 70-74, 82-110, 128, 141-163
app/db/repo/__init__.py                           3      3      0      0     0%   1-4
app/db/repo/advisor_session_repo.py              35     35      0      0     0%   13-113
app/db/repo/alert_delivery_log_repo.py           52     52      2      0     0%   3-129
app/db/repo/alert_digest_repo.py                 46     46      0      0     0%   3-100
app/db/repo/alert_repo.py                        29     29      0      0     0%   14-95
app/db/repo/alert_rule_repo.py                   48     48      0      0     0%   3-121
app/db/repo/alert_rule_run_repo.py               30     30      0      0     0%   3-77
app/db/repo/alert_run_repo.py                    37     37      0      0     0%   3-124
app/db/repo/alert_scheduler_lock_repo.py         23     23      2      0     0%   3-43
app/db/repo/audit_repo.py                        61     61      2      0     0%   1-181
app/db/repo/profile_repo.py                      17     17      0      0     0%   13-79
app/db/repo/saved_search_checkpoint_repo.py      22     22      0      0     0%   3-109
app/db/repo/saved_search_repo.py                 58     58      0      0     0%   14-223
app/db/repo/saved_search_snapshot_repo.py        16     16      0      0     0%   3-53
app/db/repo/thread_repo.py                      106    106      6      0     0%   1-289
app/db/repo/upstream_audit_repo.py               17     17      0      0     0%   16-100
app/db/sqlalchemy_metadata.py                     3      3      0      0     0%   7-10
app/engine/__init__.py                            3      3      0      0     0%   1-4
app/engine/evaluator.py                          56     56     14      0     0%   1-165
app/engine/reason_library.py                     41     41     16      0     0%   1-56
app/engine/scoring.py                            59     59     30      0     0%   1-91
app/engine/thread_summary_v1.py                  64     64     28      0     0%   1-122
app/llm/__init__.py                               2      2      0      0     0%   1-3
app/llm/client.py                                26     26      6      0     0%   1-44
app/llm/narrator.py                              45     45      6      0     0%   1-75
app/llm/redaction.py                             25     25     10      0     0%   1-48
app/llm/schemas.py                               22     22      8      0     0%   1-32
app/llm/thread_summarizer.py                     30     30      0      0     0%   1-61
app/main.py                                      63     63      2      0     0%   13-98
app/models/__init__.py                            7      7      0      0     0%   1-8
app/models/advisor.py                            39     39      0      0     0%   1-55
app/models/advisor_session.py                    22     22      0      0     0%   14-53
app/models/alert_digest.py                      102    102      0      0     0%   3-127
app/models/alert_rule.py                         55     55      0      0     0%   3-72
app/models/alerts.py                             24     24      0      0     0%   14-50
app/models/common.py                             10     10      0      0     0%   1-14
app/models/diagnostics.py                        19     19      0      0     0%   3-29
app/models/job.py                                31     31      4      0     0%   1-42
app/models/job_score.py                          53     53      2      0     0%   6-78
app/models/job_search.py                         27     27      2      0     0%   17-87
app/models/narration.py                          18     18      0      0     0%   1-26
app/models/outcome.py                            24     24      0      0     0%   1-34
app/models/profile.py                             8      8      0      0     0%   1-10
app/models/profile_v1.py                         27     27      2      0     0%   13-52
app/models/saved_search.py                       42     42      8      0     0%   13-71
app/models/thread.py                             33     33      0      0     0%   1-46
app/worker/__init__.py                           76     76      6      0     0%   3-148
app/worker/scheduler_engine.py                   51     51      4      0     0%   3-123
-----------------------------------------------------------------------------------------
TOTAL                                          3191   2886    410     20     9%
FAIL Required test coverage of 90% not reached. Total coverage: 9.19%
1 passed in 1.62s

### poetry run pytest
============================= test session starts ==============================
platform linux -- Python 3.12.12, pytest-9.0.2, pluggy-1.6.0
rootdir: /home/joriel/pathos/codebase/pathos-backend/pathos-backend
configfile: pyproject.toml
plugins: anyio-4.12.1, cov-7.0.0
collected 229 items

tests/adapters/usajobs/test_mapper.py ..                                 [  0%]
tests/api/advisor_session/test__categories__advisor_session.py .......   [  3%]
tests/api/alerts/test__categories__alerts.py .............               [  8%]
tests/api/alerts/test__categories__alerts_observability_v1.py ...        [  9%]
tests/api/alerts/test__categories__alerts_run_v1.py .......              [ 12%]
tests/api/diagnostics/test__categories__usajobs_diagnostics.py ..        [ 13%]
tests/api/jobs/test__categories__job_score.py ....                       [ 16%]
tests/api/jobs/test__categories__jobs_search.py ..........               [ 20%]
tests/api/jobs/test__equivalence__job_search_service.py ...              [ 22%]
tests/api/jobs/test__missing_usajobs_key_returns_config_error.py .       [ 22%]
tests/api/jobs/test__positive__normalize.py ..                           [ 23%]
tests/api/jobs/test__positive__usajobs_client.py .........               [ 27%]
tests/api/profile/test__categories__profile.py .......                   [ 30%]
tests/api/saved_searches/test__categories__saved_searches.py .......     [ 33%]
tests/boundary/test_boundary_testing_hardening_v1.py ..                  [ 34%]
tests/db/repo/test_alert_rule_repo.py ...                                [ 35%]
tests/db/repo/test_alert_scheduler_lock_repo.py ..                       [ 36%]
tests/db/repo/test_repository_contracts.py ......                        [ 39%]
tests/edge_case/test_edge_case_testing_hardening_v1.py ..                [ 40%]
tests/integration/test_jobs_search.py .                                  [ 40%]
tests/misuse_case/test_misuse_case_testing_hardening_v1.py ..            [ 41%]
tests/negative/test_negative_testing_hardening_v1.py ..                  [ 42%]
tests/positive/test_positive_testing_hardening_v1.py ..                  [ 43%]
tests/services/test_alert_evaluator.py ..                                [ 44%]
tests/services/test_delivery_transport_service.py ..                     [ 44%]
tests/services/test_delta_engine_service.py ..                           [ 45%]
tests/services/test_digest_builder_service.py .                          [ 46%]
tests/services/test_job_scoring_service.py .....                         [ 48%]
tests/services/test_saved_search_checkpoint_service.py .                 [ 49%]
tests/services/test_saved_search_runner_service.py .                     [ 49%]
tests/test_advisor_engine_golden.py .....                                [ 51%]
tests/test_advisor_writes_audit.py .                                     [ 52%]
tests/test_alembic_migrations.py ..                                      [ 53%]
tests/test_audit_repo.py .                                               [ 53%]
tests/test_auth.py ......                                                [ 56%]
tests/test_category_boundary_security.py .......                         [ 59%]
tests/test_config.py ...                                                 [ 60%]
tests/test_db_postgres_helpers.py ....                                   [ 62%]
tests/test_delete_audit.py .                                             [ 62%]
tests/test_delete_thread_cascades_messages.py .                          [ 63%]
tests/test_desktop_contract_cors.py ....                                 [ 65%]
tests/test_error_contract_observability.py ........                      [ 68%]
tests/test_evaluate_and_narrate_contract.py .                            [ 68%]
tests/test_export_and_desktop_contracts.py ...                           [ 70%]
tests/test_export_thread_includes_linked_audits.py .                     [ 70%]
tests/test_health_readiness.py .......                                   [ 73%]
tests/test_import_safe_app_factory.py ..                                 [ 74%]
tests/test_llm_client.py ....                                            [ 76%]
tests/test_llm_schemas.py ....                                           [ 78%]
tests/test_log_event_registry_and_schema.py ...                          [ 79%]
tests/test_logging_context.py ..                                         [ 80%]
tests/test_logging_hardening_slice88.py ..                               [ 81%]
tests/test_main_import_side_effects.py .                                 [ 81%]
tests/test_meta_openapi.py ..                                            [ 82%]
tests/test_migration_safety_slice87.py ..                                [ 83%]
tests/test_migrations_runner.py ...                                      [ 84%]
tests/test_models_validate.py ......                                     [ 87%]
tests/test_narration_audit_attach.py .                                   [ 87%]
tests/test_narration_fallback.py .                                       [ 88%]
tests/test_narration_schema_validation.py ..                             [ 89%]
tests/test_openapi_snapshot_regression.py .                              [ 89%]
tests/test_postgres_smoke.py .                                           [ 89%]
tests/test_rate_limit.py ..                                              [ 90%]
tests/test_request_completion_logging.py .....                           [ 93%]
tests/test_thread_messages_store_toggle.py .                             [ 93%]
tests/test_thread_summary_deterministic.py .                             [ 93%]
tests/test_thread_summary_llm_fallback.py .                              [ 94%]
tests/test_thread_summary_opt_in_enforced.py .                           [ 94%]
tests/test_thread_summary_updates_on_message.py .                        [ 95%]
tests/test_thread_trace_linking.py .                                     [ 95%]
tests/test_threads_opt_in.py .                                           [ 96%]
tests/test_wipe_requires_confirm.py .                                    [ 96%]
tests/test_worker_alerts.py ...                                          [ 97%]
tests/test_worker_scheduler_engine.py ...                                [ 99%]
tests/use_case/test_use_case_testing_hardening_v1.py ..                  [100%]

================================ tests coverage ================================
_______________ coverage: platform linux, python 3.12.12-final-0 _______________

Name                                              Stmts   Miss Branch BrPart  Cover   Missing
---------------------------------------------------------------------------------------------
app/__init__.py                                       0      0      0      0   100%
app/adapters/__init__.py                              0      0      0      0   100%
app/adapters/usajobs/__init__.py                      0      0      0      0   100%
app/adapters/usajobs/client.py                       59      4     14      3    90%   98-99, 110, 112, 120->123
app/adapters/usajobs/errors.py                        7      0      0      0   100%
app/adapters/usajobs/mapper.py                        6      0      0      0   100%
app/adapters/usajobs/models.py                       34      0      0      0   100%
app/adapters/usajobs/normalize.py                    60      4     30      5    90%   34, 37-38, 48, 60->59, 103->111, 105->104
app/adapters/usajobs/types.py                        15      0      0      0   100%
app/api/__init__.py                                   0      0      0      0   100%
app/api/v1/__init__.py                                0      0      0      0   100%
app/api/v1/advisor.py                                33      2      0      0    94%   41-42
app/api/v1/advisor_session.py                        31      5      0      0    84%   49, 62-63, 72-73
app/api/v1/alerts.py                                129     23      8      0    83%   94-95, 102-103, 122, 129-130, 137-138, 145-146, 167, 169, 171, 173, 176-177, 191-194, 203-204
app/api/v1/audit.py                                  19      2      0      0    89%   26-27
app/api/v1/desktop.py                                36      0      0      0   100%
app/api/v1/diagnostics.py                            15      0      4      0   100%
app/api/v1/export.py                                 21      1      0      0    95%   30
app/api/v1/health.py                                 46      7      6      2    83%   22-24, 48-56, 77-78
app/api/v1/jobs.py                                   57      0      2      0   100%
app/api/v1/meta.py                                    5      0      0      0   100%
app/api/v1/profile_v1.py                             14      0      0      0   100%
app/api/v1/saved_searches.py                         30     4      0      0    87%   54-55, 64-65
app/api/v1/thread_summary.py                         22      2      0      0    91%   27-28
app/api/v1/threads.py                                48      4      0      0    92%   52-53, 75-76
app/api/v1/wipe.py                                   14      0      2      0   100%
app/contracts/__init__.py                             2      0      0      0   100%
app/contracts/desktop_contract.py                    10      0      0      0   100%
app/contracts/error_contract.py                      14      0      0      0   100%
app/core/__init__.py                                  3      0      0      0   100%
app/core/config.py                                  186     28     32      6    82%   30-36, 41-47, 158, 162, 279-280, 303-304, 309-310, 328, 331-333, 341, 347
app/core/error_codes.py                              26      3      8      1    82%   121-123
app/core/error_handlers.py                           60      4      6      2    91%   31-34, 40->42
app/core/event_ids.py                                 2      0      0      0   100%
app/core/logging.py                                  40      3      6      1    91%   51-52, 74
app/core/readiness.py                                19      2      2      0    90%   20-21
app/core/request_context.py                          33      0      0      0   100%
app/core/security.py                                 16      0     10      0   100%
app/core/startup_validation.py                       35      4     18      4    85%   44, 47, 50, 59
app/db/__init__.py                                    2      0      0      0   100%
app/db/connection.py                                154     14     42      8    89%   39-41, 43-45, 130, 134-135, 232, 234, 236, 261, 263
app/db/migration_safety.py                           73     19     24      7    69%   41, 45, 49->51, 53-56, 62-64, 67-68, 91-92, 95-104, 116
app/db/migrations/__init__.py                         2      0      0      0   100%
app/db/migrations/runner.py                         106     21     36      7    77%   28, 34-36, 38-40, 55, 59-60, 74, 84-94, 106
app/db/repo/__init__.py                               3      0      0      0   100%
app/db/repo/advisor_session_repo.py                  35      0      0      0   100%
app/db/repo/alert_delivery_log_repo.py               52     14      2      0    70%   86-100, 104-114, 118-129
app/db/repo/alert_digest_repo.py                     46      5      0      0    89%   49-62
app/db/repo/alert_repo.py                            29      0      0      0   100%
app/db/repo/alert_rule_repo.py                       48      0      0      0   100%
app/db/repo/alert_rule_run_repo.py                   30      0      0      0   100%
app/db/repo/alert_run_repo.py                        37      5      0      0    86%   120-124
app/db/repo/alert_scheduler_lock_repo.py             23      0      2      0   100%
app/db/repo/audit_repo.py                            61      1      2      1    97%   133
app/db/repo/profile_repo.py                          17      0      0      0   100%
app/db/repo/saved_search_checkpoint_repo.py          22      0      0      0   100%
app/db/repo/saved_search_repo.py                     58      0      0      0   100%
app/db/repo/saved_search_snapshot_repo.py            16      0      0      0   100%
app/db/repo/thread_repo.py                          106      5      6      1    95%   119-138, 257
app/db/repo/upstream_audit_repo.py                   17      5      0      0    71%   88-100
app/db/sqlalchemy_metadata.py                         3      0      0      0   100%
app/domain/jobs/__init__.py                           0      0      0      0   100%
app/domain/jobs/canonical_models.py                  21      0      0      0   100%
app/engine/__init__.py                                3      0      0      0   100%
app/engine/evaluator.py                              56      5     14      2    87%   101-104, 138-145
app/engine/reason_library.py                         41      6     16      6    79%   22, 24, 26, 33, 38, 42
app/engine/scoring.py                                59      5     30      3    89%   25, 31, 54-56
app/engine/thread_summary_v1.py                      64      4     28      5    90%   34, 43, 46->41, 108, 122
app/llm/__init__.py                                   2      0      0      0   100%
app/llm/client.py                                    26      0      6      0   100%
app/llm/narrator.py                                  45      1      6      0    98%   73
app/llm/redaction.py                                 25      3     10      2    86%   9, 14, 46
app/llm/schemas.py                                   22      0      8      0   100%
app/llm/thread_summarizer.py                         30      3      0      0    90%   57-59
app/main.py                                          63      0      2      0   100%
app/middleware/rate_limit.py                         48      7     14      4    79%   20-21, 30-32, 39, 52
app/middleware/request_id.py                         50      1     14      2    95%   24, 71->73
app/models/__init__.py                                7      0      0      0   100%
app/models/advisor.py                                39      0      0      0   100%
app/models/advisor_session.py                        22      0      0      0   100%
app/models/alert_digest.py                          102      0      0      0   100%
app/models/alert_rule.py                             55      0      0      0   100%
app/models/alerts.py                                 24      0      0      0   100%
app/models/common.py                                 10      0      0      0   100%
app/models/diagnostics.py                            19      0      0      0   100%
app/models/job.py                                    31      2      4      2    89%   13, 31
app/models/job_score.py                              53      1      2      1    96%   23
app/models/job_search.py                             27      1      2      1    93%   69
app/models/narration.py                              18      2      0      0    89%   25-26
app/models/outcome.py                                24      0      0      0   100%
app/models/profile.py                                 8      0      0      0   100%
app/models/profile_v1.py                             27      1      2      1    93%   36
app/models/saved_search.py                           42      2      8      3    90%   35, 53, 54->56
app/models/thread.py                                 33      0      0      0   100%
app/services/advisor_service.py                      22      0      0      0   100%
app/services/advisor_session_service.py              61      3     12      3    92%   117, 142, 153
app/services/alert_digest_service.py                 64     11     18      4    74%   18, 21-27, 58->62, 60->62, 98-100
app/services/alert_evaluator.py                      38      3     10      3    88%   43, 47, 49
app/services/alert_rule_service.py                   46      4      8      4    85%   39, 63, 70, 89
app/services/alert_service.py                        77      6     14      2    89%   67, 191-194, 202
app/services/alerts_run_service.py                  290     17     66     13    92%   82, 85-86, 91, 95-102, 110, 135, 140, 273, 275-277, 356->397, 414, 416, 449, 616
app/services/audit_service.py                        44      6     10      5    80%   23->26, 44, 61-63, 86, 92
app/services/delivery_transport_service.py           14      0      0      0   100%
app/services/delta_engine_service.py                 51      1     8      1    97%   93
app/services/digest_builder_service.py               29      0      8      0   100%
app/services/export_service.py                       27      4      4      1    84%   31, 35-37
app/services/job_scoring_ruleset.py                   8      0      0      0   100%
app/services/job_scoring_service.py                  96      4     38      2    96%   65-66, 92-93
app/services/job_search_service.py                  121     21     28      6    82%   129, 131, 139, 141, 143, 247-306, 321
app/services/narration_service.py                    12      0      2      1    93%   13->20
app/services/profile_service.py                      43      0      4      0   100%
app/services/saved_search_checkpoint_service.py      39      2     12      2    92%   27, 34
app/services/saved_search_runner_service.py          48      1     10      1    97%   34
app/services/saved_search_service.py                 74      2     14      3    94%   52->49, 154, 189
app/services/thread_service.py                       92     10     28      7    84%   41-44, 66, 68, 119, 121, 168, 192
app/services/usajobs_diagnostics_service.py          43      4      2      0    91%   101, 119, 136-137
app/services/wipe_service.py                         14      0      4      2    89%   14->16, 16->19
app/worker/__init__.py                               76     25      6      1    63%   113-136, 140, 144-148
app/worker/scheduler_engine.py                       51      0      4      0   100%
---------------------------------------------------------------------------------------------
TOTAL                                              4663    359    738    141    90%
Required test coverage of 90% reached. Total coverage: 90.04%
======================== 229 passed in 93.45s (0:01:33) ========================

## Slices 87-92 Alert Digests Alembic Fix - 2026-02-23T14:23:30Z

## Summary
- Added Alembic revision to create the alert_digests table and indexes for Postgres parity.
- Updated Alembic migration tests to assert the new head revision.

## Files Changed
- `alembic/versions/20260223_000001_add_alert_digests_table_v1.py`
- `tests/test_alembic_migrations.py`

## Behavior Changes
- Alembic Postgres upgrades now create alert_digests (and indexes) when missing.
- Alembic head assertions now expect revision 20260223_000001.

## Follow-ups / Deferred
- Patch artifacts and change brief were not generated per explicit instruction.

## Commands Run (Results)

### git status
On branch feature/slices-87-92-prod-hardening-sprint-v1
Your branch is up to date with 'origin/feature/slices-87-92-prod-hardening-sprint-v1'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   tests/test_alembic_migrations.py

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	alembic/versions/20260223_000001_add_alert_digests_table_v1.py

no changes added to commit (use "git add" and/or "git commit -a")

### git branch --show-current
feature/slices-87-92-prod-hardening-sprint-v1

### git diff --name-status develop...HEAD
M	.github/workflows/ci.yml
A	.pre-commit-config.yaml
M	README.md
A	alembic.ini
A	alembic/env.py
A	alembic/script.py.mako
A	alembic/versions/20260222_000001_baseline_v1.py
M	app/api/v1/health.py
M	app/core/config.py
M	app/core/event_ids.py
M	app/core/logging.py
M	app/core/readiness.py
M	app/core/request_context.py
M	app/db/connection.py
M	app/db/migration_safety.py
M	app/db/repo/alert_rule_repo.py
M	app/db/repo/saved_search_repo.py
A	app/db/sqlalchemy_metadata.py
M	app/services/alerts_run_service.py
R056	app/worker.py	app/worker/__init__.py
A	app/worker/scheduler_engine.py
A	artifacts/slice-86-db-migrations-alembic-v1.name-status.txt
A	artifacts/slices-87-92-prod-hardening-sprint-v1.name-status.txt
A	docs/change-briefs/slices-87-92-prod-hardening-sprint-v1.md
A	docs/merge-notes/current.md
A	docs/schema-versioning-discipline.md
A	merge-notes-slice-86.md
M	merge-notes.md
M	poetry.lock
M	pyproject.toml
A	scripts/ci/check_schema_migration_discipline.py
A	scripts/ci/ruff_format_check_changed.py
A	tests/db/repo/test_repository_contracts.py
A	tests/test_alembic_migrations.py
M	tests/test_health_readiness.py
M	tests/test_log_event_registry_and_schema.py
M	tests/test_logging_context.py
A	tests/test_logging_hardening_slice88.py
A	tests/test_migration_safety_slice87.py
M	tests/test_migrations_runner.py
A	tests/test_worker_scheduler_engine.py

### git diff --stat develop...HEAD
 .github/workflows/ci.yml                           |   65 +-
 .pre-commit-config.yaml                            |    7 +
 README.md                                          |   38 +-
 alembic.ini                                        |   39 +
 alembic/env.py                                     |   52 +
 alembic/script.py.mako                             |   26 +
 alembic/versions/20260222_000001_baseline_v1.py    |  167 +++
 app/api/v1/health.py                               |   61 +-
 app/core/config.py                                 |   32 +-
 app/core/event_ids.py                              |    7 +
 app/core/logging.py                                |   12 +-
 app/core/readiness.py                              |   16 +-
 app/core/request_context.py                        |   10 +
 app/db/connection.py                               |  145 ++-
 app/db/migration_safety.py                         |  169 ++-
 app/db/repo/alert_rule_repo.py                     |    4 +-
 app/db/repo/saved_search_repo.py                   |    4 +-
 app/db/sqlalchemy_metadata.py                      |   10 +
 app/services/alerts_run_service.py                 |   30 +
 app/{worker.py => worker/__init__.py}              |   60 +-
 app/worker/scheduler_engine.py                     |  131 ++
 ...ice-86-db-migrations-alembic-v1.name-status.txt |    0
 ...-87-92-prod-hardening-sprint-v1.name-status.txt |   15 +
 .../slices-87-92-prod-hardening-sprint-v1.md       |   25 +
 docs/merge-notes/current.md                        | 1348 ++++++++++++++++++++
 docs/schema-versioning-discipline.md               |   25 +
 merge-notes-slice-86.md                            | 1085 ++++++++++++++++
 merge-notes.md                                     | 1153 ++---------------
 poetry.lock                                        |  505 +++++++-
 pyproject.toml                                     |    3 +
 scripts/ci/check_schema_migration_discipline.py    |   75 ++
 scripts/ci/ruff_format_check_changed.py            |   70 +
 tests/db/repo/test_repository_contracts.py         |  181 +++
 tests/test_alembic_migrations.py                   |   75 ++
 tests/test_health_readiness.py                     |   60 +-
 tests/test_log_event_registry_and_schema.py        |    9 +-
 tests/test_logging_context.py                      |   23 +-
 tests/test_logging_hardening_slice88.py            |   21 +
 tests/test_migration_safety_slice87.py             |   62 +
 tests/test_migrations_runner.py                    |   24 +-
 tests/test_worker_scheduler_engine.py              |  102 ++
 41 files changed, 4739 insertions(+), 1207 deletions(-)

### poetry run alembic history
20260222_000001 -> 20260223_000001 (head), Add alert_digests table for Postgres parity.
<base> -> 20260222_000001, Slice 86 baseline migration scaffold.

### poetry run alembic upgrade head
- Result: failed (DuplicateTable: relation "alert_digests" already exists)

### poetry run alembic upgrade head (after adding if_not_exists)
- Result: (no output)

### poetry run pytest -q tests/db/repo/test_repository_contracts.py -k postgres --cov=app --cov-fail-under=0
- Result: 3 passed, 3 deselected in 5.84s

### poetry run pytest (first run)
- Result: 2 failed, 227 passed in 94.15s (test_alembic_migrations expected old head revision)

### poetry run pytest (second run)
- Result: 229 passed in 93.49s

## Slices 87-92 CI Coverage Gate Alignment - 2026-02-23T14:50:21Z

## Summary
- Aligned CI quality-gates pytest command with the full-suite coverage gate.

## Files Changed
- `.github/workflows/ci.yml`

## Behavior Changes
- CI quality-gates now runs `poetry run pytest` instead of `poetry run pytest -q`.

## Commands Run (Results)

### git status
On branch feature/slices-87-92-prod-hardening-sprint-v1
Your branch is up to date with 'origin/feature/slices-87-92-prod-hardening-sprint-v1'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   .github/workflows/ci.yml

no changes added to commit (use "git add" and/or "git commit -a")

### git branch --show-current
feature/slices-87-92-prod-hardening-sprint-v1

### git diff --name-status develop...HEAD
M	.github/workflows/ci.yml
A	.pre-commit-config.yaml
M	README.md
A	alembic.ini
A	alembic/env.py
A	alembic/script.py.mako
A	alembic/versions/20260222_000001_baseline_v1.py
A	alembic/versions/20260223_000001_add_alert_digests_table_v1.py
M	app/api/v1/health.py
M	app/core/config.py
M	app/core/event_ids.py
M	app/core/logging.py
M	app/core/readiness.py
M	app/core/request_context.py
M	app/db/connection.py
M	app/db/migration_safety.py
M	app/db/repo/alert_rule_repo.py
M	app/db/repo/saved_search_repo.py
A	app/db/sqlalchemy_metadata.py
M	app/services/alerts_run_service.py
R055	app/worker.py	app/worker/__init__.py
A	app/worker/scheduler_engine.py
A	artifacts/slice-86-db-migrations-alembic-v1.name-status.txt
A	artifacts/slices-87-92-prod-hardening-sprint-v1.name-status.txt
A	docs/change-briefs/slices-87-92-prod-hardening-sprint-v1.md
A	docs/merge-notes/current.md
A	docs/schema-versioning-discipline.md
A	merge-notes-slice-86.md
M	merge-notes.md
M	poetry.lock
M	pyproject.toml
A	scripts/ci/check_schema_migration_discipline.py
A	scripts/ci/ruff_format_check_changed.py
A	tests/db/repo/test_repository_contracts.py
A	tests/test_alembic_migrations.py
M	tests/test_health_readiness.py
M	tests/test_log_event_registry_and_schema.py
M	tests/test_logging_context.py
A	tests/test_logging_hardening_slice88.py
A	tests/test_migration_safety_slice87.py
M	tests/test_migrations_runner.py
A	tests/test_worker_scheduler_engine.py

### git diff --stat develop...HEAD
 .github/workflows/ci.yml                           |   65 +-
 .pre-commit-config.yaml                            |    7 +
 README.md                                          |   38 +-
 alembic.ini                                        |   39 +
 alembic/env.py                                     |   52 +
 alembic/script.py.mako                             |   26 +
 alembic/versions/20260222_000001_baseline_v1.py    |  167 +++
 .../20260223_000001_add_alert_digests_table_v1.py  |   67 +
 app/api/v1/health.py                               |   67 +-
 app/core/config.py                                 |   32 +-
 app/core/event_ids.py                              |    7 +
 app/core/logging.py                                |   36 +-
 app/core/readiness.py                              |   16 +-
 app/core/request_context.py                        |   14 +-
 app/db/connection.py                               |  145 +-
 app/db/migration_safety.py                         |  177 ++-
 app/db/repo/alert_rule_repo.py                     |   13 +-
 app/db/repo/saved_search_repo.py                   |   23 +-
 app/db/sqlalchemy_metadata.py                      |   10 +
 app/services/alerts_run_service.py                 |  185 ++-
 app/{worker.py => worker/__init__.py}              |   71 +-
 app/worker/scheduler_engine.py                     |  139 ++
 ...ice-86-db-migrations-alembic-v1.name-status.txt |    0
 ...-87-92-prod-hardening-sprint-v1.name-status.txt |   15 +
 .../slices-87-92-prod-hardening-sprint-v1.md       |   25 +
 docs/merge-notes/current.md                        | 1491 ++++++++++++++++++++
 docs/schema-versioning-discipline.md               |   25 +
 merge-notes-slice-86.md                            | 1085 ++++++++++++++
 merge-notes.md                                     | 1153 +--------------
 poetry.lock                                        |  505 ++++++-
 pyproject.toml                                     |    3 +
 scripts/ci/check_schema_migration_discipline.py    |   87 ++
 scripts/ci/ruff_format_check_changed.py            |   96 ++
 tests/db/repo/test_repository_contracts.py         |  203 +++
 tests/test_alembic_migrations.py                   |   80 ++
 tests/test_health_readiness.py                     |   93 +-
 tests/test_log_event_registry_and_schema.py        |  107 +-
 tests/test_logging_context.py                      |   23 +-
 tests/test_logging_hardening_slice88.py            |   21 +
 tests/test_migration_safety_slice87.py             |   62 +
 tests/test_migrations_runner.py                    |   32 +-
 tests/test_worker_scheduler_engine.py              |  112 ++
 42 files changed, 5334 insertions(+), 1280 deletions(-)

### poetry run pytest
- Result: 229 passed in 94.70s

## 2026-02-23 - Slice 90 Worker Init Coverage Lift (no commit)

### Branch
`feature/slices-87-92-prod-hardening-sprint-v1`

### Requested Git State Snapshots

**Command:** `git status`

```text
On branch feature/slices-87-92-prod-hardening-sprint-v1
Your branch is up to date with 'origin/feature/slices-87-92-prod-hardening-sprint-v1'.

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	tests/test_worker_init_branches_slice90.py

nothing added to commit but untracked files present (use "git add" to track)
```

**Command:** `git branch --show-current`

```text
feature/slices-87-92-prod-hardening-sprint-v1
```

**Command:** `git diff --name-status develop...HEAD`

```text
M	.github/workflows/ci.yml
A	.pre-commit-config.yaml
M	alembic/env.py
M	alembic/versions/20260222_000001_baseline_v1.py
A	alembic/versions/20260223_000001_add_alert_digests_table_v1.py
M	app/api/v1/health.py
M	app/core/config.py
M	app/core/event_ids.py
M	app/core/logging.py
M	app/core/readiness.py
M	app/core/request_context.py
M	app/db/connection.py
M	app/db/migration_safety.py
M	app/db/repo/alert_rule_repo.py
M	app/db/repo/saved_search_repo.py
M	app/db/sqlalchemy_metadata.py
M	app/services/alerts_run_service.py
R055	app/worker.py	app/worker/__init__.py
A	app/worker/scheduler_engine.py
A	artifacts/slices-87-92-prod-hardening-sprint-v1.name-status.txt
A	docs/change-briefs/slices-87-92-prod-hardening-sprint-v1.md
M	docs/merge-notes/current.md
A	docs/schema-versioning-discipline.md
M	poetry.lock
M	pyproject.toml
A	scripts/ci/check_schema_migration_discipline.py
A	scripts/ci/ruff_format_check_changed.py
A	tests/db/repo/test_repository_contracts.py
M	tests/test_alembic_migrations.py
M	tests/test_health_readiness.py
M	tests/test_log_event_registry_and_schema.py
M	tests/test_logging_context.py
A	tests/test_logging_hardening_slice88.py
A	tests/test_migration_safety_slice87.py
M	tests/test_migrations_runner.py
A	tests/test_worker_scheduler_engine.py
```

**Command:** `git diff --stat develop...HEAD`

```text
 .github/workflows/ci.yml                           |   67 +-
 .pre-commit-config.yaml                            |    7 +
 alembic/env.py                                     |    4 +-
 alembic/versions/20260222_000001_baseline_v1.py    |   78 +-
 .../20260223_000001_add_alert_digests_table_v1.py  |   67 +
 app/api/v1/health.py                               |   67 +-
 app/core/config.py                                 |    8 +-
 app/core/event_ids.py                              |    7 +
 app/core/logging.py                                |   36 +-
 app/core/readiness.py                              |   16 +-
 app/core/request_context.py                        |   14 +-
 app/db/connection.py                               |  115 +-
 app/db/migration_safety.py                         |  177 ++-
 app/db/repo/alert_rule_repo.py                     |   13 +-
 app/db/repo/saved_search_repo.py                   |   23 +-
 app/db/sqlalchemy_metadata.py                      |    1 -
 app/services/alerts_run_service.py                 |  185 ++-
 app/{worker.py => worker/__init__.py}              |   71 +-
 app/worker/scheduler_engine.py                     |  139 ++
 ...-87-92-prod-hardening-sprint-v1.name-status.txt |   15 +
 .../slices-87-92-prod-hardening-sprint-v1.md       |   25 +
 docs/merge-notes/current.md                        | 1583 ++++++++++++++++++++
 docs/schema-versioning-discipline.md               |   25 +
 poetry.lock                                        |  200 ++-
 pyproject.toml                                     |    1 +
 scripts/ci/check_schema_migration_discipline.py    |   87 ++
 scripts/ci/ruff_format_check_changed.py            |   96 ++
 tests/db/repo/test_repository_contracts.py         |  203 +++
 tests/test_alembic_migrations.py                   |   33 +-
 tests/test_health_readiness.py                     |   93 +-
 tests/test_log_event_registry_and_schema.py        |  107 +-
 tests/test_logging_context.py                      |   23 +-
 tests/test_logging_hardening_slice88.py            |   21 +
 tests/test_migration_safety_slice87.py             |   62 +
 tests/test_migrations_runner.py                    |   32 +-
 tests/test_worker_scheduler_engine.py              |  112 ++
 36 files changed, 3593 insertions(+), 220 deletions(-)
```

### Test/Quality Results Summary

- Added `tests/test_worker_init_branches_slice90.py` to cover worker entrypoint branches: happy path, lock contention/blocked path, exception handling, hourly scheduling branches, alias delegation, and `__main__` startup failure exit behavior.
- `poetry run ruff format tests/test_worker_init_branches_slice90.py` => 1 file reformatted.
- `poetry run ruff check .` => passed.
- `poetry run pytest` => passed (`236 passed`), total coverage `90.59%` (threshold `>= 90%`), and `app/worker/__init__.py` reached `100%`.
- `poetry run python scripts/ci/ruff_format_check_changed.py` => passed (`28 files already formatted`).

## 2026-02-23 - CI gate hardening: schema-base-ref resolution + coverage nudge

### Branch
`feature/slices-87-92-prod-hardening-sprint-v1`

### Changes made
- Updated `scripts/ci/check_schema_migration_discipline.py` to resolve diff base ref robustly in CI:
  - verify `<base_ref>` commit locally
  - fallback to `origin/<base_ref>`
  - if missing, fetch `origin <base_ref>` (and fallback fetch `origin origin/<base_ref>`) before re-resolving
  - run diff using `<resolved_base>...HEAD`
- Added `tests/test_migration_safety_additional_coverage.py` with minimal branch tests in `app/db/migration_safety.py`:
  - `get_db_revision()` returns `None` when query execution raises
  - deterministic fail-mode mismatch raises `MigrationSafetyError` with expected message

### Required git logging

**Command:** `git status`

```text
On branch feature/slices-87-92-prod-hardening-sprint-v1
Your branch is up to date with 'origin/feature/slices-87-92-prod-hardening-sprint-v1'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   scripts/ci/check_schema_migration_discipline.py

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	tests/test_migration_safety_additional_coverage.py

no changes added to commit (use "git add" and/or "git commit -a")
```

**Command:** `git branch --show-current`

```text
feature/slices-87-92-prod-hardening-sprint-v1
```

**Command:** `git diff --name-status develop...HEAD`

```text
M	.github/workflows/ci.yml
A	.pre-commit-config.yaml
M	alembic/env.py
M	alembic/versions/20260222_000001_baseline_v1.py
A	alembic/versions/20260223_000001_add_alert_digests_table_v1.py
M	app/api/v1/health.py
M	app/core/config.py
M	app/core/event_ids.py
M	app/core/logging.py
M	app/core/readiness.py
M	app/core/request_context.py
M	app/db/connection.py
M	app/db/migration_safety.py
M	app/db/repo/alert_rule_repo.py
M	app/db/repo/saved_search_repo.py
M	app/db/sqlalchemy_metadata.py
M	app/services/alerts_run_service.py
R055	app/worker.py	app/worker/__init__.py
A	app/worker/scheduler_engine.py
A	artifacts/slices-87-92-prod-hardening-sprint-v1.name-status.txt
A	docs/change-briefs/slices-87-92-prod-hardening-sprint-v1.md
M	docs/merge-notes/current.md
A	docs/schema-versioning-discipline.md
M	poetry.lock
M	pyproject.toml
A	scripts/ci/check_schema_migration_discipline.py
A	scripts/ci/ruff_format_check_changed.py
A	tests/db/repo/test_repository_contracts.py
M	tests/test_alembic_migrations.py
M	tests/test_health_readiness.py
M	tests/test_log_event_registry_and_schema.py
M	tests/test_logging_context.py
A	tests/test_logging_hardening_slice88.py
A	tests/test_migration_safety_slice87.py
M	tests/test_migrations_runner.py
A	tests/test_worker_init_branches_slice90.py
A	tests/test_worker_scheduler_engine.py
```

**Command:** `git diff --stat develop...HEAD`

```text
 .github/workflows/ci.yml                           |   67 +-
 .pre-commit-config.yaml                            |    7 +
 alembic/env.py                                     |    4 +-
 alembic/versions/20260222_000001_baseline_v1.py    |   78 +-
 .../20260223_000001_add_alert_digests_table_v1.py  |   67 +
 app/api/v1/health.py                               |   67 +-
 app/core/config.py                                 |    8 +-
 app/core/event_ids.py                              |    7 +
 app/core/logging.py                                |   36 +-
 app/core/readiness.py                              |   16 +-
 app/core/request_context.py                        |   14 +-
 app/db/connection.py                               |  115 +-
 app/db/migration_safety.py                         |  177 +-
 app/db/repo/alert_rule_repo.py                     |   13 +-
 app/db/repo/saved_search_repo.py                   |   23 +-
 app/db/sqlalchemy_metadata.py                      |    1 -
 app/services/alerts_run_service.py                 |  185 ++-
 app/{worker.py => worker/__init__.py}              |   71 +-
 app/worker/scheduler_engine.py                     |  139 ++
 ...-87-92-prod-hardening-sprint-v1.name-status.txt |   15 +
 .../slices-87-92-prod-hardening-sprint-v1.md       |   25 +
 docs/merge-notes/current.md                        | 1700 ++++++++++++++++++++
 docs/schema-versioning-discipline.md               |   25 +
 poetry.lock                                        |  200 ++-
 pyproject.toml                                     |    1 +
 scripts/ci/check_schema_migration_discipline.py    |   87 +
 scripts/ci/ruff_format_check_changed.py            |   96 ++
 tests/db/repo/test_repository_contracts.py         |  203 +++
 tests/test_alembic_migrations.py                   |   33 +-
 tests/test_health_readiness.py                     |   93 +-
 tests/test_log_event_registry_and_schema.py        |  107 +-
 tests/test_logging_context.py                      |   23 +-
 tests/test_logging_hardening_slice88.py            |   21 +
 tests/test_migration_safety_slice87.py             |   62 +
 tests/test_migrations_runner.py                    |   32 +-
 tests/test_worker_init_branches_slice90.py         |  225 +++
 tests/test_worker_scheduler_engine.py              |  112 ++
 37 files changed, 3935 insertions(+), 220 deletions(-)
```

### Validation summary
- `poetry run ruff format scripts/ci/check_schema_migration_discipline.py tests/test_migration_safety_additional_coverage.py` -> passed (`1 file reformatted, 1 file left unchanged`)
- `poetry run ruff check .` -> passed
- `poetry run python scripts/ci/check_schema_migration_discipline.py --base-ref develop` -> passed, no crash; output included `Schema discipline check base ref: develop`
- `poetry run pytest` -> passed (`238 passed`), total coverage `90.63%` (>= 90%)
- `poetry run python scripts/ci/ruff_format_check_changed.py` -> passed (`29 files already formatted`)

## 2026-02-23 - Slices 93-95 Trust Boundary / Deterministic Integrity (start)

### Start-of-run git snapshots

**Command:** `git status`

```text
On branch feature/slices-93-95-trust-boundary-deterministic-integrity-v1
nothing to commit, working tree clean
```

**Command:** `git branch --show-current`

```text
feature/slices-93-95-trust-boundary-deterministic-integrity-v1
```

**Command:** `git diff --name-status develop...HEAD`

```text
```

**Command:** `git diff --stat develop...HEAD`

```text
```

### Plan note
- Execution order locked: Step 1 -> targeted validation -> Step 2 -> targeted validation -> Step 3 -> targeted validation -> full test run.
- No patch artifacts or change brief will be generated until all steps are complete and passing.

### Step 1 complete - Slice 93 Trust Boundary Hardening v1

#### Step 1 command log
- `poetry run ruff check .` -> pass
- `poetry run pytest -q tests/test_health_readiness.py tests/test_migration_safety_slice87.py --cov=app --cov-fail-under=0` -> pass (`10 passed`)

#### Step 1 git snapshots

**Command:** `git status`

```text
On branch feature/slices-93-95-trust-boundary-deterministic-integrity-v1
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   app/core/event_ids.py
	modified:   app/db/connection.py
	modified:   app/db/repo/audit_repo.py
	modified:   app/db/repo/upstream_audit_repo.py
	modified:   app/services/export_service.py
	modified:   app/services/job_search_service.py
	modified:   docs/merge-notes/current.md
	modified:   tests/test_alembic_migrations.py
	modified:   tests/test_audit_repo.py
	modified:   tests/test_migration_safety_slice87.py

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	alembic/versions/20260223_000002_add_db_migration_audit_table_v1.py
	app/db/migrations/011_migration_audit_log_v1.sql
	tests/test_export_integrity_slice93.py
	tests/test_upstream_audit_integrity_slice93.py

no changes added to commit (use "git add" and/or "git commit -a")
```

**Command:** `git branch --show-current`

```text
feature/slices-93-95-trust-boundary-deterministic-integrity-v1
```

**Command:** `git diff --name-status develop...HEAD`

```text
```

**Command:** `git diff --stat develop...HEAD`

```text
```

### Step 2 complete - Slice 94 Deterministic Engine Isolation Audit

#### Step 2 command log
- `poetry run ruff check .` -> pass
- `poetry run pytest -q tests/test_evaluate_and_narrate_contract.py tests/test_narration_fallback.py tests/test_narration_schema_validation.py --cov=app --cov-fail-under=0` -> pass (`6 passed`)

#### Step 2 git snapshots

**Command:** `git status`

```text
On branch feature/slices-93-95-trust-boundary-deterministic-integrity-v1
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   app/core/event_ids.py
	modified:   app/db/connection.py
	modified:   app/db/repo/audit_repo.py
	modified:   app/db/repo/upstream_audit_repo.py
	modified:   app/services/export_service.py
	modified:   app/services/job_search_service.py
	modified:   app/services/narration_service.py
	modified:   docs/merge-notes/current.md
	modified:   tests/test_alembic_migrations.py
	modified:   tests/test_audit_repo.py
	modified:   tests/test_evaluate_and_narrate_contract.py
	modified:   tests/test_migration_safety_slice87.py
	modified:   tests/test_narration_fallback.py

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	alembic/versions/20260223_000002_add_db_migration_audit_table_v1.py
	app/db/migrations/011_migration_audit_log_v1.sql
	tests/test_export_integrity_slice93.py
	tests/test_upstream_audit_integrity_slice93.py

no changes added to commit (use "git add" and/or "git commit -a")
```

**Command:** `git branch --show-current`

```text
feature/slices-93-95-trust-boundary-deterministic-integrity-v1
```

**Command:** `git diff --name-status develop...HEAD`

```text
```

**Command:** `git diff --stat develop...HEAD`

```text
```

### Step 3 complete - Slice 95 Full System Integrity Harness (Pre-beta)

#### Step 3 command log
- `poetry run ruff check .` -> pass
- `poetry run pytest -q tests/integrity/test_system_integrity_harness_v1.py --cov=app --cov-fail-under=0` -> pass (`1 passed`)
- `poetry run pytest` -> pass (`247 passed`), coverage `90.86%`

#### Step 3 git snapshots

**Command:** `git status`

```text
On branch feature/slices-93-95-trust-boundary-deterministic-integrity-v1
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   app/core/event_ids.py
	modified:   app/db/connection.py
	modified:   app/db/repo/audit_repo.py
	modified:   app/db/repo/upstream_audit_repo.py
	modified:   app/services/export_service.py
	modified:   app/services/job_search_service.py
	modified:   app/services/narration_service.py
	modified:   docs/merge-notes/current.md
	modified:   tests/test_alembic_migrations.py
	modified:   tests/test_audit_repo.py
	modified:   tests/test_evaluate_and_narrate_contract.py
	modified:   tests/test_log_event_registry_and_schema.py
	modified:   tests/test_migration_safety_slice87.py
	modified:   tests/test_narration_fallback.py

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	alembic/versions/20260223_000002_add_db_migration_audit_table_v1.py
	app/db/migrations/011_migration_audit_log_v1.sql
	tests/integrity/
	tests/test_export_integrity_slice93.py
	tests/test_upstream_audit_integrity_slice93.py

no changes added to commit (use "git add" and/or "git commit -a")
```

**Command:** `git branch --show-current`

```text
feature/slices-93-95-trust-boundary-deterministic-integrity-v1
```

**Command:** `git diff --name-status develop...HEAD`

```text
```

**Command:** `git diff --stat develop...HEAD`

```text
```

### End-of-cycle snapshot

#### End command log summary
- Step 1 target validation passed (`ruff check`, targeted migration/readiness tests).
- Step 2 target validation passed (`ruff check`, targeted evaluation/narration tests).
- Step 3 target validation passed (integrity harness + full suite).
- Full suite final status: `247 passed`, total coverage `90.86%`.
- No patch artifacts and no change brief generated in this cycle (per instruction).

#### End git snapshots

**Command:** `git status`

```text
On branch feature/slices-93-95-trust-boundary-deterministic-integrity-v1
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   app/core/event_ids.py
	modified:   app/db/connection.py
	modified:   app/db/repo/audit_repo.py
	modified:   app/db/repo/upstream_audit_repo.py
	modified:   app/services/export_service.py
	modified:   app/services/job_search_service.py
	modified:   app/services/narration_service.py
	modified:   docs/merge-notes/current.md
	modified:   tests/test_alembic_migrations.py
	modified:   tests/test_audit_repo.py
	modified:   tests/test_evaluate_and_narrate_contract.py
	modified:   tests/test_log_event_registry_and_schema.py
	modified:   tests/test_migration_safety_slice87.py
	modified:   tests/test_narration_fallback.py

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	alembic/versions/20260223_000002_add_db_migration_audit_table_v1.py
	app/db/migrations/011_migration_audit_log_v1.sql
	tests/integrity/
	tests/test_export_integrity_slice93.py
	tests/test_upstream_audit_integrity_slice93.py

no changes added to commit (use "git add" and/or "git commit -a")
```

**Command:** `git branch --show-current`

```text
feature/slices-93-95-trust-boundary-deterministic-integrity-v1
```

**Command:** `git diff --name-status develop...HEAD`

```text
```

**Command:** `git diff --stat develop...HEAD`

```text
```

## feature/slices-96-98-worker-parity-observability-v1

### Start-of-cycle snapshot

#### Start command log summary
- Initialized Slices 96–98 cycle on this branch.
- Verified branch and baseline diff against `develop`.

#### Start git snapshots

**Command:** `git status`

```text
On branch feature/slices-96-98-worker-parity-observability-v1
nothing to commit, working tree clean
```

**Command:** `git branch --show-current`

```text
feature/slices-96-98-worker-parity-observability-v1
```

**Command:** `git diff --name-status develop...HEAD`

```text
```

**Command:** `git diff --stat develop...HEAD`

```text
```

### After Step 1 (Slice 96) snapshot

#### Step 1 command log summary
- `poetry run ruff format app/worker/retry_policy.py app/core/config.py app/worker/__init__.py app/services/alerts_run_service.py app/services/delivery_transport_service.py app/db/repo/alert_digest_repo.py app/worker/scheduler_engine.py tests/test_worker_scheduler_engine.py tests/test_worker_alerts.py app/core/event_ids.py` -> completed; formatting applied where needed.
- `poetry run ruff check .` -> passed.
- `poetry run pytest -q tests/test_worker_scheduler_engine.py tests/test_worker_alerts.py --cov=app --cov-fail-under=0` -> passed (`9 passed`).

#### Step 1 git snapshots

**Command:** `git status`

```text
On branch feature/slices-96-98-worker-parity-observability-v1
Changes not staged for commit:
  modified:   app/core/config.py
  modified:   app/core/event_ids.py
  modified:   app/db/repo/alert_digest_repo.py
  modified:   app/services/alerts_run_service.py
  modified:   app/services/delivery_transport_service.py
  modified:   app/worker/__init__.py
  modified:   app/worker/scheduler_engine.py
  modified:   docs/merge-notes/current.md
  modified:   tests/test_worker_alerts.py
  modified:   tests/test_worker_scheduler_engine.py

Untracked files:
  app/worker/retry_policy.py
```

**Command:** `git branch --show-current`

```text
feature/slices-96-98-worker-parity-observability-v1
```

**Command:** `git diff --name-status develop...HEAD`

```text
```

**Command:** `git diff --stat develop...HEAD`

```text
```

### After Step 2 (Slice 97) snapshot

#### Step 2 command log summary
- `poetry run ruff check .` -> passed.
- `poetry run pytest -q tests/db/repo/test_repository_contracts.py tests/integrity/test_system_integrity_harness_v1.py --cov=app --cov-fail-under=0` -> passed (`13 passed`).
- `poetry run pytest -q tests/db/repo/test_repository_contracts.py -k postgres --cov=app --cov-fail-under=0` -> passed (`6 passed, 6 deselected`).
- Added CI Postgres optional integrity harness run: `poetry run pytest -q tests/integrity/test_system_integrity_harness_v1.py --no-cov`.

#### Step 2 git snapshots

**Command:** `git status`

```text
On branch feature/slices-96-98-worker-parity-observability-v1
Changes not staged for commit:
  modified:   .github/workflows/ci.yml
  modified:   app/core/config.py
  modified:   app/core/event_ids.py
  modified:   app/db/repo/alert_digest_repo.py
  modified:   app/services/alerts_run_service.py
  modified:   app/services/delivery_transport_service.py
  modified:   app/worker/__init__.py
  modified:   app/worker/scheduler_engine.py
  modified:   docs/merge-notes/current.md
  modified:   tests/db/repo/test_repository_contracts.py
  modified:   tests/test_worker_alerts.py
  modified:   tests/test_worker_scheduler_engine.py

Untracked files:
  app/core/worker_retry_policy.py
```

**Command:** `git branch --show-current`

```text
feature/slices-96-98-worker-parity-observability-v1
```

**Command:** `git diff --name-status develop...HEAD`

```text
```

**Command:** `git diff --stat develop...HEAD`

```text
```

### After Step 3 (Slice 98) snapshot

#### Step 3 command log summary
- `poetry run ruff check .` -> passed.
- `poetry run pytest -q tests/test_health_readiness.py tests/test_log_event_registry_and_schema.py --cov=app --cov-fail-under=0` -> passed (`11 passed`).
- Added `/api/v1/diagnostics/snapshot` with safe runtime metadata and bounded error summaries.
- Expanded `/health/ready` response shape with worker/migration/lock observability metadata.

#### Step 3 git snapshots

**Command:** `git status`

```text
On branch feature/slices-96-98-worker-parity-observability-v1
Changes not staged for commit:
  modified:   .github/workflows/ci.yml
  modified:   app/api/v1/diagnostics.py
  modified:   app/api/v1/health.py
  modified:   app/core/config.py
  modified:   app/core/event_ids.py
  modified:   app/db/connection.py
  modified:   app/db/repo/alert_digest_repo.py
  modified:   app/db/repo/alert_scheduler_lock_repo.py
  modified:   app/models/diagnostics.py
  modified:   app/services/alerts_run_service.py
  modified:   app/services/delivery_transport_service.py
  modified:   app/services/export_service.py
  modified:   app/worker/__init__.py
  modified:   app/worker/scheduler_engine.py
  modified:   docs/merge-notes/current.md
  modified:   tests/db/repo/test_repository_contracts.py
  modified:   tests/test_health_readiness.py
  modified:   tests/test_log_event_registry_and_schema.py
  modified:   tests/test_worker_alerts.py
  modified:   tests/test_worker_scheduler_engine.py

Untracked files:
  app/core/worker_retry_policy.py
  app/db/repo/migration_audit_repo.py
```

**Command:** `git branch --show-current`

```text
feature/slices-96-98-worker-parity-observability-v1
```

**Command:** `git diff --name-status develop...HEAD`

```text
```

**Command:** `git diff --stat develop...HEAD`

```text
```

### End-of-cycle snapshot

#### End command log summary
- `poetry run python scripts/ci/ruff_format_check_changed.py` -> passed (no changed Python files detected by base-ref comparison).
- `poetry run pytest` -> passed (`257 passed`, total coverage `90.80%`).
- Generated artifacts:
  - `artifacts/slices-96-98-worker-parity-observability-v1.patch`
  - `artifacts/slices-96-98-worker-parity-observability-v1-this-run.patch`
  - `artifacts/slices-96-98-worker-parity-observability-v1.name-status.txt`
- Created Change Brief:
  - `docs/change-briefs/slices-96-98-worker-parity-observability-v1.md`

#### Artifacts listing

**Command:** `ls -lh artifacts/`

```text
total 988K
-rw-r--r-- ... slices-96-98-worker-parity-observability-v1-this-run.patch (62K)
-rw-r--r-- ... slices-96-98-worker-parity-observability-v1.name-status.txt (0)
-rw-r--r-- ... slices-96-98-worker-parity-observability-v1.patch (0)
```

#### End git snapshots

**Command:** `git status`

```text
On branch feature/slices-96-98-worker-parity-observability-v1
Changes not staged for commit:
  modified:   .github/workflows/ci.yml
  modified:   app/api/v1/diagnostics.py
  modified:   app/api/v1/health.py
  modified:   app/core/config.py
  modified:   app/core/event_ids.py
  modified:   app/db/connection.py
  modified:   app/db/repo/alert_digest_repo.py
  modified:   app/db/repo/alert_scheduler_lock_repo.py
  modified:   app/models/diagnostics.py
  modified:   app/services/alerts_run_service.py
  modified:   app/services/delivery_transport_service.py
  modified:   app/services/export_service.py
  modified:   app/worker/__init__.py
  modified:   app/worker/scheduler_engine.py
  modified:   artifacts/contracts/openapi.json
  modified:   docs/merge-notes/current.md
  modified:   tests/db/repo/test_repository_contracts.py
  modified:   tests/test_health_readiness.py
  modified:   tests/test_log_event_registry_and_schema.py
  modified:   tests/test_worker_alerts.py
  modified:   tests/test_worker_scheduler_engine.py

Untracked files:
  app/core/worker_retry_policy.py
  app/db/repo/migration_audit_repo.py
  artifacts/slices-96-98-worker-parity-observability-v1.name-status.txt
  docs/change-briefs/slices-96-98-worker-parity-observability-v1.md
```

**Command:** `git branch --show-current`

```text
feature/slices-96-98-worker-parity-observability-v1
```

**Command:** `git diff --name-status develop...HEAD`

```text
```

**Command:** `git diff --stat develop...HEAD`

```text
```

## feature/slices-99-101-operational-controls-retention-release-v1

### Start-of-cycle snapshot

#### Start command log summary
- Initialized Slices 99–101 cycle on requested branch.
- Verified clean working tree and baseline diff against `develop`.

#### Start git snapshots

**Command:** `git status`

```text
On branch feature/slices-99-101-operational-controls-retention-release-v1
nothing to commit, working tree clean
```

**Command:** `git branch --show-current`

```text
feature/slices-99-101-operational-controls-retention-release-v1
```

**Command:** `git diff --name-status develop...HEAD`

```text
```

**Command:** `git diff --stat develop...HEAD`

```text
```

### After Step 1 (Slice 99) snapshot

#### Step 1 command log summary
- `poetry run ruff check .` -> passed.
- `poetry run pytest -q tests/test_worker_scheduler_engine.py tests/test_health_readiness.py --cov=app --cov-fail-under=0` -> passed (`15 passed`).
- Added operational flags, worker pause/resume behavior, dry-run/delivery-disable controls, readiness paused-state fields, and `/api/v1/ops/status` endpoint.

#### Step 1 git snapshots

**Command:** `git status`

```text
On branch feature/slices-99-101-operational-controls-retention-release-v1
Changes not staged for commit:
  modified:   app/api/v1/health.py
  modified:   app/core/config.py
  modified:   app/core/event_ids.py
  modified:   app/main.py
  modified:   app/services/alerts_run_service.py
  modified:   app/worker/__init__.py
  modified:   docs/merge-notes/current.md
  modified:   tests/test_health_readiness.py
  modified:   tests/test_worker_scheduler_engine.py

Untracked files:
  app/api/v1/ops.py
```

**Command:** `git branch --show-current`

```text
feature/slices-99-101-operational-controls-retention-release-v1
```

**Command:** `git diff --name-status develop...HEAD`

```text
```

**Command:** `git diff --stat develop...HEAD`

```text
```

### After Step 2 (Slice 100) snapshot

#### Step 2 command log summary
- `poetry run ruff check .` -> passed.
- `poetry run pytest -q tests/test_wipe_requires_confirm.py tests/test_delete_audit.py tests/test_delete_thread_cascades_messages.py --cov=app --cov-fail-under=0` -> passed (`6 passed`).
- Added retention config knobs, retention cleanup service + CLI entry, expanded wipe data-class coverage, and retention/wipe event logging.

#### Step 2 git snapshots

**Command:** `git status`

```text
On branch feature/slices-99-101-operational-controls-retention-release-v1
Changes not staged for commit:
  modified:   app/api/v1/health.py
  modified:   app/core/config.py
  modified:   app/core/event_ids.py
  modified:   app/db/repo/audit_repo.py
  modified:   app/db/repo/thread_repo.py
  modified:   app/db/repo/upstream_audit_repo.py
  modified:   app/main.py
  modified:   app/services/alerts_run_service.py
  modified:   app/services/wipe_service.py
  modified:   app/worker/__init__.py
  modified:   docs/merge-notes/current.md
  modified:   tests/test_delete_audit.py
  modified:   tests/test_delete_thread_cascades_messages.py
  modified:   tests/test_health_readiness.py
  modified:   tests/test_wipe_requires_confirm.py
  modified:   tests/test_worker_scheduler_engine.py

Untracked files:
  app/api/v1/ops.py
  app/services/retention_service.py
  scripts/ops/run_retention_cleanup.py
```

**Command:** `git branch --show-current`

```text
feature/slices-99-101-operational-controls-retention-release-v1
```

**Command:** `git diff --name-status develop...HEAD`

```text
```

**Command:** `git diff --stat develop...HEAD`

```text
```

### After Step 3 (Slice 101) snapshot

#### Step 3 command log summary
- `poetry run ruff check .` -> passed.
- `poetry run python scripts/ci/ruff_format_check_changed.py` -> passed.
- `poetry run python scripts/ci/check_schema_migration_discipline.py --base-ref develop` -> passed.
- `poetry run pytest -q tests/test_log_event_registry_and_schema.py --cov=app --cov-fail-under=0` -> passed (`3 passed`).
- Added `docs/release-checklist.md` and updated log event harness for new operational/retention/wipe event IDs.

#### Step 3 git snapshots

**Command:** `git status`

```text
On branch feature/slices-99-101-operational-controls-retention-release-v1
Changes not staged for commit:
  modified:   app/api/v1/health.py
  modified:   app/core/config.py
  modified:   app/core/event_ids.py
  modified:   app/db/repo/audit_repo.py
  modified:   app/db/repo/thread_repo.py
  modified:   app/db/repo/upstream_audit_repo.py
  modified:   app/main.py
  modified:   app/services/alerts_run_service.py
  modified:   app/services/wipe_service.py
  modified:   app/worker/__init__.py
  modified:   docs/merge-notes/current.md
  modified:   tests/test_delete_audit.py
  modified:   tests/test_delete_thread_cascades_messages.py
  modified:   tests/test_health_readiness.py
  modified:   tests/test_log_event_registry_and_schema.py
  modified:   tests/test_wipe_requires_confirm.py
  modified:   tests/test_worker_scheduler_engine.py

Untracked files:
  app/api/v1/ops.py
  app/services/retention_service.py
  docs/release-checklist.md
  scripts/ops/run_retention_cleanup.py
```

**Command:** `git branch --show-current`

```text
feature/slices-99-101-operational-controls-retention-release-v1
```

**Command:** `git diff --name-status develop...HEAD`

```text
```

**Command:** `git diff --stat develop...HEAD`

```text
```

## 2026-02-23 — Slice 99–101 End Snapshot

### git status
```text
 M app/api/v1/health.py
 M app/core/config.py
 M app/core/event_ids.py
 M app/db/repo/audit_repo.py
 M app/db/repo/thread_repo.py
 M app/db/repo/upstream_audit_repo.py
 M app/main.py
 M app/services/alerts_run_service.py
 M app/services/wipe_service.py
 M app/worker/__init__.py
 M artifacts/contracts/openapi.json
 M docs/merge-notes/current.md
 M tests/db/repo/test_repository_contracts.py
 M tests/test_delete_audit.py
 M tests/test_delete_thread_cascades_messages.py
 M tests/test_health_readiness.py
 M tests/test_log_event_registry_and_schema.py
 M tests/test_wipe_requires_confirm.py
 M tests/test_worker_init_branches_slice90.py
 M tests/test_worker_scheduler_engine.py
?? app/api/v1/ops.py
?? app/services/retention_service.py
?? artifacts/slices-99-101-operational-controls-retention-release-v1.name-status.txt
?? docs/change-briefs/slices-99-101-operational-controls-retention-release-v1.md
?? docs/release-checklist.md
?? scripts/ops/
```

### git branch --show-current
```text
feature/slices-99-101-operational-controls-retention-release-v1
```

### git diff --name-status develop...HEAD
```text
(no output; no committed delta vs develop in this working tree)
```

### git diff --stat develop...HEAD
```text
(no output; no committed delta vs develop in this working tree)
```

### Commands run + brief results (end phase)
- `poetry run ruff check .` -> pass.
- `poetry run mypy .` -> pass (no issues in 217 files).
- `poetry run python scripts/ci/ruff_format_check_changed.py` -> pass.
- `poetry run python scripts/ci/check_schema_migration_discipline.py --base-ref develop` -> pass.
- `poetry run pytest` -> pass (`264 passed`, coverage `90.97%`).
- `poetry run python scripts/export_openapi.py` -> updated OpenAPI golden snapshot.
- Generated artifacts:
  - `artifacts/slices-99-101-operational-controls-retention-release-v1.patch`
  - `artifacts/slices-99-101-operational-controls-retention-release-v1-this-run.patch`
  - `artifacts/slices-99-101-operational-controls-retention-release-v1.name-status.txt`

### artifacts listing (ls -lh artifacts)
```text
total 1.1M
drwxr-xr-x 2 joriel joriel 4.0K Feb 23 11:46 contracts
-rw-r--r-- 1 joriel joriel  81K Feb 21 03:29 day-21-this-run.patch
-rw-r--r-- 1 joriel joriel  65K Feb 21 03:29 day-21.patch
-rw-r--r-- 1 joriel joriel  72K Feb 21 03:29 day-30-this-run.patch
-rw-r--r-- 1 joriel joriel    0 Feb 21 03:29 day-30.patch
-rw-r--r-- 1 joriel joriel  28K Feb 21 03:29 day-65-request-complete-message-fix-this-run.patch
-rw-r--r-- 1 joriel joriel    0 Feb 21 03:29 day-65-request-complete-message-fix.patch
-rw-r--r-- 1 joriel joriel  52K Feb 21 03:29 day-70-this-run.patch
-rw-r--r-- 1 joriel joriel    0 Feb 21 03:29 day-70.patch
-rw-r--r-- 1 joriel joriel  22K Feb 21 03:29 day-75-this-run.patch
-rw-r--r-- 1 joriel joriel    0 Feb 21 03:29 day-75.patch
-rw-r--r-- 1 joriel joriel  40K Feb 21 03:29 day-80-continuation-this-run.patch
-rw-r--r-- 1 joriel joriel    0 Feb 21 03:29 day-80-continuation.patch
-rw-r--r-- 1 joriel joriel  27K Feb 21 03:29 day-codex-reviewer-autofix-this-run.patch
-rw-r--r-- 1 joriel joriel  12K Feb 21 03:29 day-codex-reviewer-autofix.patch
-rw-r--r-- 1 joriel joriel  23K Feb 21 03:29 day-slice-18-20-this-run.patch
-rw-r--r-- 1 joriel joriel    0 Feb 21 03:29 day-slice-18-20.patch
-rw-r--r-- 1 joriel joriel  41K Feb 21 05:01 postgres-support-flag-v1-this-run.patch
-rw-r--r-- 1 joriel joriel    0 Feb 21 05:01 postgres-support-flag-v1.patch
drwxr-xr-x 3 joriel joriel 4.0K Feb 21 03:29 prompts
drwxr-xr-x 3 joriel joriel 4.0K Feb 21 03:29 rulesets
-rw-r--r-- 1 joriel joriel  93K Feb 23 07:40 slice-86-db-migrations-alembic-v1-this-run.patch
-rw-r--r-- 1 joriel joriel    0 Feb 23 09:53 slice-86-db-migrations-alembic-v1.name-status.txt
-rw-r--r-- 1 joriel joriel    0 Feb 23 07:40 slice-86-db-migrations-alembic-v1.patch
-rw-r--r-- 1 joriel joriel 143K Feb 23 09:09 slices-87-92-prod-hardening-sprint-v1-this-run.patch
-rw-r--r-- 1 joriel joriel  395 Feb 23 10:18 slices-87-92-prod-hardening-sprint-v1.name-status.txt
-rw-r--r-- 1 joriel joriel 155K Feb 23 09:09 slices-87-92-prod-hardening-sprint-v1.patch
-rw-r--r-- 1 joriel joriel  36K Feb 23 10:41 slices-93-95-trust-boundary-deterministic-integrity-v1-this-run.patch
-rw-r--r-- 1 joriel joriel    0 Feb 23 10:50 slices-93-95-trust-boundary-deterministic-integrity-v1.name-status.txt
-rw-r--r-- 1 joriel joriel    0 Feb 23 10:41 slices-93-95-trust-boundary-deterministic-integrity-v1.patch
-rw-r--r-- 1 joriel joriel  62K Feb 23 11:14 slices-96-98-worker-parity-observability-v1-this-run.patch
-rw-r--r-- 1 joriel joriel    0 Feb 23 11:46 slices-96-98-worker-parity-observability-v1.name-status.txt
-rw-r--r-- 1 joriel joriel    0 Feb 23 11:14 slices-96-98-worker-parity-observability-v1.patch
-rw-r--r-- 1 joriel joriel  62K Feb 23 12:14 slices-99-101-operational-controls-retention-release-v1-this-run.patch
-rw-r--r-- 1 joriel joriel    0 Feb 23 12:14 slices-99-101-operational-controls-retention-release-v1.name-status.txt
-rw-r--r-- 1 joriel joriel    0 Feb 23 12:14 slices-99-101-operational-controls-retention-release-v1.patch
```

## 2026-02-23 — Slices 102–104 Start Snapshot

### git status
```text
(clean working tree)
```

### git branch --show-current
```text
feature/slices-102-104-desktop-contracts-runbook-telemetry-v1
```

### git diff --name-status develop...HEAD
```text
(no output)
```

### git diff --stat develop...HEAD
```text
(no output)
```

### Commands run + brief results
- Read required docs: `docs/ai/cursor-house-rules.md`, `docs/ai/testing-standards.md`, `docs/ai/prompt-header.md`.
- Captured required start git snapshot commands; branch confirmed; workspace clean.

## 2026-02-23 — Slices 102–104 Step 1 (Slice 102) Snapshot

### git status
```text
 M app/api/v1/export.py
 M app/api/v1/health.py
 M app/models/diagnostics.py
 M docs/merge-notes/current.md
?? tests/contract/
```

### git branch --show-current
```text
feature/slices-102-104-desktop-contracts-runbook-telemetry-v1
```

### git diff --name-status develop...HEAD
```text
(no output)
```

### git diff --stat develop...HEAD
```text
(no output)
```

### Commands run + brief results
- `poetry run ruff check .` -> pass.
- `poetry run pytest -q tests/test_health_readiness.py tests/test_log_event_registry_and_schema.py tests/contract/test_desktop_contracts_v1.py --cov=app --cov-fail-under=0` -> pass (`15 passed`).
- Added explicit response models for `/health/ready` and export endpoints, and added desktop contract tests for `/health/ready`, `/api/v1/diagnostics/snapshot`, and export integrity metadata.

## 2026-02-23 — Slices 102–104 Step 2 (Slice 103) Snapshot

### git status
```text
 M app/api/v1/export.py
 M app/api/v1/health.py
 M app/models/diagnostics.py
 M docs/merge-notes/current.md
?? docs/runbook/
?? scripts/ops/self_check.py
?? tests/contract/
```

### git branch --show-current
```text
feature/slices-102-104-desktop-contracts-runbook-telemetry-v1
```

### git diff --name-status develop...HEAD
```text
(no output)
```

### git diff --stat develop...HEAD
```text
(no output)
```

### Commands run + brief results
- `poetry run ruff check .` -> pass.
- `poetry run python scripts/ops/self_check.py` -> pass, emitted redacted JSON snapshot with env/version/dialect/revision/last worker + migration audit metadata.
- `poetry run pytest -q tests/test_health_readiness.py --cov=app --cov-fail-under=0` -> pass (`9 passed`).
- Added runbook and incident playbooks under `docs/runbook/`.
- Added import-safe operator self-check command: `scripts/ops/self_check.py`.

## 2026-02-23 — Slices 102–104 Step 3 (Slice 104) Snapshot

### git status
```text
 M app/api/v1/diagnostics.py
 M app/api/v1/export.py
 M app/api/v1/health.py
 M app/core/config.py
 M app/core/event_ids.py
 M app/models/diagnostics.py
 M app/services/retention_service.py
 M app/services/wipe_service.py
 M docs/merge-notes/current.md
?? alembic/versions/20260223_000003_add_telemetry_metrics_table_v1.py
?? app/db/migrations/012_telemetry_metrics_v1.sql
?? app/db/repo/telemetry_repo.py
?? app/services/telemetry_service.py
?? docs/runbook/
?? scripts/ops/self_check.py
?? tests/contract/
?? tests/test_diagnostics_snapshot.py
?? tests/test_telemetry_v1.py
```

### git branch --show-current
```text
feature/slices-102-104-desktop-contracts-runbook-telemetry-v1
```

### git diff --name-status develop...HEAD
```text
(no output)
```

### git diff --stat develop...HEAD
```text
(no output)
```

### Commands run + brief results
- `poetry run ruff check .` -> pass.
- `poetry run pytest -q tests/test_diagnostics_snapshot.py tests/test_telemetry_v1.py --cov=app --cov-fail-under=0` -> pass (`4 passed`).
- Added telemetry feature-flag (`TELEMETRY_ENABLED`, default false), telemetry DB schema (sqlite + alembic), telemetry repo/service, and diagnostics telemetry summary endpoint.
- Added telemetry tests for disabled/enabled behavior and retention cleanup coverage.

## 2026-02-23 — Slices 102–104 End Snapshot

### git status
```text
 M app/api/v1/diagnostics.py
 M app/api/v1/export.py
 M app/api/v1/health.py
 M app/core/config.py
 M app/core/event_ids.py
 M app/models/diagnostics.py
 M app/services/retention_service.py
 M app/services/wipe_service.py
 M artifacts/contracts/openapi.json
 M docs/merge-notes/current.md
 M tests/test_alembic_migrations.py
 M tests/test_log_event_registry_and_schema.py
?? alembic/versions/20260223_000003_add_telemetry_metrics_table_v1.py
?? app/db/migrations/012_telemetry_metrics_v1.sql
?? app/db/repo/telemetry_repo.py
?? app/services/telemetry_service.py
?? artifacts/slices-102-104-desktop-contracts-runbook-telemetry-v1.name-status.txt
?? docs/change-briefs/slices-102-104-desktop-contracts-runbook-telemetry-v1.md
?? docs/runbook/
?? scripts/ops/self_check.py
?? tests/contract/
?? tests/test_diagnostics_snapshot.py
?? tests/test_telemetry_v1.py
```

### git branch --show-current
```text
feature/slices-102-104-desktop-contracts-runbook-telemetry-v1
```

### git diff --name-status develop...HEAD
```text
(no output)
```

### git diff --stat develop...HEAD
```text
(no output)
```

### Commands run + brief results
- `poetry run ruff check .` -> pass.
- `poetry run python scripts/ci/ruff_format_check_changed.py` -> pass.
- `poetry run mypy .` -> pass (`no issues found in 224 source files`).
- `poetry run pytest` -> pass (`271 passed`, coverage `91.14%`).
- `poetry run python scripts/export_openapi.py` -> pass; refreshed OpenAPI golden snapshot for new/updated contracts.
- Generated artifacts:
  - `artifacts/slices-102-104-desktop-contracts-runbook-telemetry-v1.patch`
  - `artifacts/slices-102-104-desktop-contracts-runbook-telemetry-v1-this-run.patch`
  - `artifacts/slices-102-104-desktop-contracts-runbook-telemetry-v1.name-status.txt`

### artifacts listing (ls -lh artifacts)
```text
total 1.1M
drwxr-xr-x 2 joriel joriel 4.0K Feb 23 12:29 contracts
-rw-r--r-- 1 joriel joriel  81K Feb 21 03:29 day-21-this-run.patch
-rw-r--r-- 1 joriel joriel  65K Feb 21 03:29 day-21.patch
-rw-r--r-- 1 joriel joriel  72K Feb 21 03:29 day-30-this-run.patch
-rw-r--r-- 1 joriel joriel    0 Feb 21 03:29 day-30.patch
-rw-r--r-- 1 joriel joriel  28K Feb 21 03:29 day-65-request-complete-message-fix-this-run.patch
-rw-r--r-- 1 joriel joriel    0 Feb 21 03:29 day-65-request-complete-message-fix.patch
-rw-r--r-- 1 joriel joriel  52K Feb 21 03:29 day-70-this-run.patch
-rw-r--r-- 1 joriel joriel    0 Feb 21 03:29 day-70.patch
-rw-r--r-- 1 joriel joriel  22K Feb 21 03:29 day-75-this-run.patch
-rw-r--r-- 1 joriel joriel    0 Feb 21 03:29 day-75.patch
-rw-r--r-- 1 joriel joriel  40K Feb 21 03:29 day-80-continuation-this-run.patch
-rw-r--r-- 1 joriel joriel    0 Feb 21 03:29 day-80-continuation.patch
-rw-r--r-- 1 joriel joriel  27K Feb 21 03:29 day-codex-reviewer-autofix-this-run.patch
-rw-r--r-- 1 joriel joriel  12K Feb 21 03:29 day-codex-reviewer-autofix.patch
-rw-r--r-- 1 joriel joriel  23K Feb 21 03:29 day-slice-18-20-this-run.patch
-rw-r--r-- 1 joriel joriel    0 Feb 21 03:29 day-slice-18-20.patch
-rw-r--r-- 1 joriel joriel  41K Feb 21 05:01 postgres-support-flag-v1-this-run.patch
-rw-r--r-- 1 joriel joriel    0 Feb 21 05:01 postgres-support-flag-v1.patch
drwxr-xr-x 3 joriel joriel 4.0K Feb 21 03:29 prompts
drwxr-xr-x 3 joriel joriel 4.0K Feb 21 03:29 rulesets
-rw-r--r-- 1 joriel joriel  93K Feb 23 07:40 slice-86-db-migrations-alembic-v1-this-run.patch
-rw-r--r-- 1 joriel joriel    0 Feb 23 09:53 slice-86-db-migrations-alembic-v1.name-status.txt
-rw-r--r-- 1 joriel joriel    0 Feb 23 07:40 slice-86-db-migrations-alembic-v1.patch
-rw-r--r-- 1 joriel joriel  27K Feb 23 12:46 slices-102-104-desktop-contracts-runbook-telemetry-v1-this-run.patch
-rw-r--r-- 1 joriel joriel    0 Feb 23 12:46 slices-102-104-desktop-contracts-runbook-telemetry-v1.name-status.txt
-rw-r--r-- 1 joriel joriel    0 Feb 23 12:46 slices-102-104-desktop-contracts-runbook-telemetry-v1.patch
-rw-r--r-- 1 joriel joriel 143K Feb 23 09:09 slices-87-92-prod-hardening-sprint-v1-this-run.patch
-rw-r--r-- 1 joriel joriel  395 Feb 23 10:18 slices-87-92-prod-hardening-sprint-v1.name-status.txt
-rw-r--r-- 1 joriel joriel 155K Feb 23 09:09 slices-87-92-prod-hardening-sprint-v1.patch
-rw-r--r-- 1 joriel joriel  36K Feb 23 10:41 slices-93-95-trust-boundary-deterministic-integrity-v1-this-run.patch
-rw-r--r-- 1 joriel joriel    0 Feb 23 10:50 slices-93-95-trust-boundary-deterministic-integrity-v1.name-status.txt
-rw-r--r-- 1 joriel joriel    0 Feb 23 10:41 slices-93-95-trust-boundary-deterministic-integrity-v1.patch
-rw-r--r-- 1 joriel joriel  62K Feb 23 11:14 slices-96-98-worker-parity-observability-v1-this-run.patch
-rw-r--r-- 1 joriel joriel    0 Feb 23 11:46 slices-96-98-worker-parity-observability-v1.name-status.txt
-rw-r--r-- 1 joriel joriel    0 Feb 23 11:14 slices-96-98-worker-parity-observability-v1.patch
-rw-r--r-- 1 joriel joriel  658 Feb 23 12:29 slices-99-101-operational-controls-retention-release-v1-this-run.name-status.txt
-rw-r--r-- 1 joriel joriel  67K Feb 23 12:17 slices-99-101-operational-controls-retention-release-v1-this-run.patch
-rw-r--r-- 1 joriel joriel    0 Feb 23 12:29 slices-99-101-operational-controls-retention-release-v1.name-status.txt
-rw-r--r-- 1 joriel joriel    0 Feb 23 12:17 slices-99-101-operational-controls-retention-release-v1.patch
```

## 2026-02-23 — Desktop Docs Pack (Backend Overview)

### git status
```text
?? docs/contracts/
?? docs/run/
?? docs/status/backend-capabilities-map-v1.md
```

### git branch --show-current
```text
feature/slices-102-104-desktop-contracts-runbook-telemetry-v1
```

### git diff --name-status develop...HEAD
```text
A	alembic/versions/20260223_000003_add_telemetry_metrics_table_v1.py
M	app/api/v1/diagnostics.py
M	app/api/v1/export.py
M	app/api/v1/health.py
M	app/core/config.py
M	app/core/event_ids.py
A	app/db/migrations/012_telemetry_metrics_v1.sql
A	app/db/repo/telemetry_repo.py
M	app/models/diagnostics.py
M	app/services/retention_service.py
A	app/services/telemetry_service.py
M	app/services/wipe_service.py
M	artifacts/contracts/openapi.json
A	artifacts/slices-102-104-desktop-contracts-runbook-telemetry-v1.name-status.txt
A	docs/change-briefs/slices-102-104-desktop-contracts-runbook-telemetry-v1.md
M	docs/merge-notes/current.md
A	docs/runbook/backend-runbook-v1.md
A	docs/runbook/incidents/integrity-failure-hash-mismatch.md
A	docs/runbook/incidents/migration-mismatch.md
A	docs/runbook/incidents/postgres-unavailable-timeout.md
A	docs/runbook/incidents/worker-stuck-lock-contention.md
A	scripts/ops/self_check.py
A	tests/contract/test_desktop_contracts_v1.py
M	tests/test_alembic_migrations.py
A	tests/test_diagnostics_snapshot.py
M	tests/test_log_event_registry_and_schema.py
A	tests/test_telemetry_v1.py
```

### git diff --stat develop...HEAD
```text
 ...260223_000003_add_telemetry_metrics_table_v1.py |  40 +++
 app/api/v1/diagnostics.py                          |  17 +-
 app/api/v1/export.py                               |   7 +-
 app/api/v1/health.py                               |   3 +-
 app/core/config.py                                 |   8 +
 app/core/event_ids.py                              |   2 +
 app/db/migrations/012_telemetry_metrics_v1.sql     |  12 +
 app/db/repo/telemetry_repo.py                      |  69 +++++
 app/models/diagnostics.py                          |  53 ++++
 app/services/retention_service.py                  |   5 +
 app/services/telemetry_service.py                  |  86 ++++++
 app/services/wipe_service.py                       |   1 +
 artifacts/contracts/openapi.json                   | 327 ++++++++++++++++++++-
 ...-contracts-runbook-telemetry-v1.name-status.txt |   0
 ...2-104-desktop-contracts-runbook-telemetry-v1.md |  49 +++
 docs/merge-notes/current.md                        | 237 +++++++++++++++
 docs/runbook/backend-runbook-v1.md                 |  69 +++++
 .../incidents/integrity-failure-hash-mismatch.md   |  19 ++
 docs/runbook/incidents/migration-mismatch.md       |  19 ++
 .../incidents/postgres-unavailable-timeout.md      |  19 ++
 .../incidents/worker-stuck-lock-contention.md      |  19 ++
 scripts/ops/self_check.py                          |  90 ++++++
 tests/contract/test_desktop_contracts_v1.py        | 151 ++++++++++
 tests/test_alembic_migrations.py                   |   2 +-
 tests/test_diagnostics_snapshot.py                 |  38 +++
 tests/test_log_event_registry_and_schema.py        |   5 +
 tests/test_telemetry_v1.py                         |  91 ++++++
 27 files changed, 1421 insertions(+), 17 deletions(-)
```

### Summary
Created documentation deliverables for Desktop-facing backend overview:
- `docs/status/backend-capabilities-map-v1.md`
- `docs/contracts/desktop-integration-contract-pack-v1.md`
- `docs/run/backend-quickstart-v1.md`

Notes:
- Route inventory is grouped by requested domains and marks Desktop-critical endpoints.
- Contract pack is anchored to response models and contract tests.
- Quickstart includes SQLite default path, optional Postgres path, worker ops flags, and `scripts/ops/self_check.py`.
## 2026-03-05 — Day 60 Snapshot Contract Pack v1 (Preflight)

### Required reads
- docs/ai/cursor-house-rules.md (present)
- docs/ai/testing-standards.md (present)
- docs/ai/prompt-header.md (present)
- docs/architecture/*.md (missing: docs/architecture directory not found)
- README.md (present)

### git status
```text
On branch feature/day-60-backend-snapshot-contract-pack-v1
Untracked files:
  (use "git add <file>..." to include in what will be committed)
	docs/audits/

nothing added to commit but untracked files present (use "git add" to track)
warning: could not open directory '.tmp/pytest-of-comps/': Permission denied
warning: could not open directory 'data/pytest_tmp2/': Permission denied
```

### git branch --show-current
```text
feature/day-60-backend-snapshot-contract-pack-v1
```

### git diff --name-status develop...HEAD
```text
(no output)
```

### git diff --stat develop...HEAD
```text
(no output)
```
## 2026-03-05 — Day 60 Snapshot Contract Pack v1 (Implementation)

### Goal
Implement canonical, versioned, auditable snapshot contracts and deterministic intelligence endpoints:
- CareerReadinessSnapshot
- ResumeReadinessSnapshot
- JobMatchSnapshot
- ApplicationConfidenceSnapshot

### Files changed (summary)
Added:
- app/intelligence/__init__.py
- app/intelligence/snapshots/__init__.py
- app/intelligence/snapshots/models.py
- app/intelligence/snapshots/engine.py
- app/intelligence/snapshots/versions.py
- app/intelligence/snapshots/hashing.py
- app/api/v1/intelligence.py
- tests/test_intelligence_snapshot_contract_pack_v1.py
- docs/audits/backend-snapshot-contract-pack-v1.md

Updated:
- app/main.py (router wiring)
- docs/merge-notes/current.md

### Optional persistence decision
Skipped for this run (non-trivial to add DB model + migration safely without broader migration review).

### Commands run + results

#### Lint
**Command:**
`poetry run ruff check app/intelligence/snapshots app/api/v1/intelligence.py app/main.py tests/test_intelligence_snapshot_contract_pack_v1.py docs/audits/backend-snapshot-contract-pack-v1.md`

**Result:**
`All checks passed!`

#### Targeted pytest (with repo default coverage gate)
**Command:**
`poetry run pytest -q tests/test_intelligence_snapshot_contract_pack_v1.py`

**Result:**
- Endpoint tests passed (`4 passed`)
- Run failed due global repo coverage gate (`FAIL Required test coverage of 90% not reached. Total coverage: 44.15%`)

#### Targeted pytest (no coverage, behavior verification)
**Command:**
`poetry run pytest -q --no-cov tests/test_intelligence_snapshot_contract_pack_v1.py`

**Result:**
`4 passed, 1 warning in 2.35s`

Warning observed:
- `.pytest_cache` write warning due local permission restrictions.

#### Patch artifacts
Commands executed:
- `mkdir -p artifacts` equivalent: `New-Item -ItemType Directory -Force artifacts | Out-Null`
- `git diff develop...HEAD > artifacts/day-60.patch` equivalent (UTF-8):
  - `git diff develop...HEAD | Out-File -FilePath artifacts/day-60.patch -Encoding utf8`
- `git diff > artifacts/day-60-this-run.patch` equivalent (UTF-8):
  - `git diff | Out-File -FilePath artifacts/day-60-this-run.patch -Encoding utf8`
- Listing artifacts (`ls -lh artifacts` equivalent):
  - `cmd /c dir artifacts`

Artifacts listing (excerpt):
- `day-60.patch` size: `0`
- `day-60-this-run.patch` size: `2,371`

Note:
- `day-60.patch` is empty because `develop...HEAD` compares commit history only and this run did not create commits.
- Attempt to include untracked files via `git add -N .` hit a local permission error on `.git/index.lock`.

### Follow-ups
- Integrate Career Graph knowledge pack signals beyond v1 deterministic stubs.
- Integrate Person Graph resume/profile evidence extraction for canonical evidence references.
- Add low-risk snapshot persistence table once migration scope is approved.
## 2026-03-05 — Day 60 Merge-Ready Pass (Preflight + Drift Fix)

### Required reads
- docs/ai/cursor-house-rules.md (read)
- docs/ai/testing-standards.md (read)
- docs/ai/prompt-header.md (read)
- docs/architecture/*.md (now satisfied by `docs/architecture/README.md`)
- README.md (previously read during Day 60 run)

### git status
```text
On branch feature/day-60-backend-snapshot-contract-pack-v1
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   app/main.py
	modified:   docs/merge-notes/current.md

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	app/api/v1/intelligence.py
	app/intelligence/
	docs/audits/
	tests/test_intelligence_snapshot_contract_pack_v1.py

no changes added to commit (use "git add" and/or "git commit -a")
warning: could not open directory '.tmp/pytest-of-comps/': Permission denied
warning: could not open directory 'data/pytest_tmp2/': Permission denied
```

### git branch --show-current
```text
feature/day-60-backend-snapshot-contract-pack-v1
```

### git diff --name-status develop...HEAD
```text
(no output)
```

### git diff --stat develop...HEAD
```text
(no output)
```

### Audit discoverability updates
- Day 60 audit doc exists: `docs/audits/backend-snapshot-contract-pack-v1.md`
- This merge-note section now references the audit doc directly for quick lookup.
## 2026-03-05 — Day 60 Merge-Ready Pass (Gates + Artifacts)

### Gate: poetry run ruff check .
**Result:** PASS
```text
All checks passed!
```

### Gate: poetry run mypy .
**Result:** PASS
```text
Success: no issues found in 232 source files
```

### Gate: poetry run pytest
**Result:** FAIL (environment + suite baseline)
Key failures observed:
- Initial run: collection error on restricted local folder `data/pytest_tmp2` (`PermissionError: [WinError 5] Access is denied`).
- Retried with writable temp base (`--basetemp artifacts/pytest_tmp`) and ignores for local restricted folders; suite still fails broadly and coverage gate fails (`total of 59 is less than fail-under=90`).

Commands attempted:
- `poetry run pytest`
- `poetry run pytest --basetemp artifacts\\pytest_tmp`
- `poetry run pytest --ignore=data/pytest_tmp2 --ignore=.tmp/pytest-of-comps --basetemp artifacts\\pytest_tmp`

### Patch artifacts regenerated
Commands run:
- `git diff develop...HEAD > artifacts/day-60.patch`
- `git diff > artifacts/day-60-this-run.patch`

`ls -lh artifacts` attempt:
```text
Access is denied.
Error code: Bash/Service/CreateInstance/E_ACCESSDENIED
```

`cmd /c dir artifacts` output:
```text
Volume in drive C is OS
Volume Serial Number is 562F-A8FD

Directory of C:\dev\PathOS\codebase\pathos-backend\artifacts

03/05/2026  03:35 PM    <DIR>          .
03/05/2026  03:36 PM    <DIR>          ..
...
03/05/2026  03:16 PM             2,371 day-60-this-run.patch
03/05/2026  03:16 PM                 0 day-60.patch
...
```

### Audit reference (Day 60)
- `docs/audits/backend-snapshot-contract-pack-v1.md`
## 2026-03-05 — Day 60 Merge-Ready Attempt (Stop Condition)

### Preflight
#### git status
```text
On branch feature/day-60-backend-snapshot-contract-pack-v1
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   app/main.py
	modified:   docs/merge-notes/current.md

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	app/api/v1/intelligence.py
	app/intelligence/
	docs/architecture/
	docs/audits/
	tests/test_intelligence_snapshot_contract_pack_v1.py

no changes added to commit (use "git add" and/or "git commit -a")
warning: could not open directory '.tmp/pytest-of-comps/': Permission denied
warning: could not open directory 'artifactspytest_cache/': Permission denied
warning: could not open directory 'artifactspytest_tmp/': Permission denied
warning: could not open directory 'data/pytest_tmp2/': Permission denied
```

#### git branch --show-current
```text
feature/day-60-backend-snapshot-contract-pack-v1
```

#### git diff --name-status develop...HEAD
```text
(no output)
```

#### git diff --stat develop...HEAD
```text
(no output)
```

### Pytest writable dirs
Created/ensured:
- `artifacts/pytest_tmp`
- `artifacts/pytest_cache`

Artifact listing:
```text
(see cmd /c dir artifacts output below in this run)
```

### Chosen PYTEST_ADDOPTS approach
Used environment variable:
- `--basetemp artifacts/pytest_tmp`
- `-o cache_dir=artifacts/pytest_cache`

Command pattern:
```powershell
$env:PYTEST_ADDOPTS='--basetemp artifacts/pytest_tmp -o cache_dir=artifacts/pytest_cache'
```

### Quality gates
#### poetry run ruff check .
PASS

#### poetry run mypy .
PASS

#### poetry run pytest
FAIL

Retry per instruction with explicit ignores:
```powershell
poetry run pytest --ignore=data/pytest_tmp2 --ignore=.tmp/pytest-of-comps --ignore=artifactspytest_cache --ignore=artifactspytest_tmp
```

Still FAIL (environment permissions + coverage gate below 90 in this environment).

### First failing error stack trace section (most relevant excerpt)
Command:
```powershell
$env:PYTEST_ADDOPTS='--basetemp artifacts/pytest_tmp -o cache_dir=artifacts/pytest_cache'; poetry run pytest --ignore=data/pytest_tmp2 --ignore=.tmp/pytest-of-comps --ignore=artifactspytest_cache --ignore=artifactspytest_tmp
```

Excerpt:
```text
ERROR: Coverage failure: total of 59 is less than fail-under=90
...
  File "...\\_pytest\\tmpdir.py", line 304, in pytest_sessionfinish
    cleanup_dead_symlinks(basetemp)
  File "...\\_pytest\\pathlib.py", line 357, in cleanup_dead_symlinks
    for left_dir in root.iterdir():
  File "...\\pathlib.py", line 1056, in iterdir
    for name in os.listdir(self):
PermissionError: [WinError 5] Access is denied: 'C:\\dev\\PathOS\\codebase\\pathos-backend\\artifacts\\pytest_tmp'
```

Environment:
- OS: Windows (win32, Python 3.12.10)
- Shell: PowerShell
- Permission paths involved:
  - `C:\dev\PathOS\codebase\pathos-backend\artifacts\pytest_tmp`
  - `C:\dev\PathOS\codebase\pathos-backend\data\pytest_tmp2`
  - `C:\dev\PathOS\codebase\pathos-backend\artifactspytest_cache`
  - `C:\dev\PathOS\codebase\pathos-backend\artifactspytest_tmp`

What was tried:
1. Created writable dirs under `artifacts/`.
2. Forced pytest temp/cache via `PYTEST_ADDOPTS`.
3. Ran full suite `poetry run pytest`.
4. Reran with explicit ignores for blocked folders.
5. Kept CI/coverage policy unchanged (no threshold changes).

### Patch artifacts (this run)
Commands:
- `git diff develop...HEAD > artifacts/day-60.patch`
- `git diff > artifacts/day-60-this-run.patch`
- `cmd /c dir artifacts`

Result:
- `day-60.patch` generated
- `day-60-this-run.patch` generated
- directory listing captured in command output
## 2026-03-05 — Day 60 Windows Temp Root Attempt (Preflight)

### git status
```text
On branch feature/day-60-backend-snapshot-contract-pack-v1
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   app/main.py
	modified:   docs/merge-notes/current.md

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	app/api/v1/intelligence.py
	app/intelligence/
	artifacts/pytest_cache/
	docs/architecture/
	docs/audits/
	tests/test_intelligence_snapshot_contract_pack_v1.py

no changes added to commit (use "git add" and/or "git commit -a")
warning: could not open directory '.tmp/pytest-of-comps/': Permission denied
warning: could not open directory 'artifacts/pytest_tmp/': Permission denied
warning: could not open directory 'artifactspytest_cache/': Permission denied
warning: could not open directory 'artifactspytest_tmp/': Permission denied
warning: could not open directory 'data/pytest_tmp2/': Permission denied
```

### git branch --show-current
```text
feature/day-60-backend-snapshot-contract-pack-v1
```

### git diff --name-status develop...HEAD
```text
(no output)
```

### git diff --stat develop...HEAD
```text
(no output)
```
## 2026-03-05 — Day 60 Windows Temp/Cache Fix (Green Run)

### Temp root setup outside repo
Commands used:
```powershell
if (-not (Test-Path C:\Temp)) { New-Item -ItemType Directory -Path C:\Temp | Out-Null }
New-Item -ItemType Directory -Force -Path C:\Temp\pathos_pytest\basetemp | Out-Null
New-Item -ItemType Directory -Force -Path C:\Temp\pathos_pytest\cache | Out-Null
icacls "C:\Temp\pathos_pytest" /grant "$env:USERNAME`:(OI)(CI)F" /T
Remove-Item -Recurse -Force C:\Temp\pathos_pytest\basetemp\* -ErrorAction SilentlyContinue
icacls "C:\Temp\pathos_pytest"
```

icacls output:
```text
C:\Temp\pathos_pytest RIVAS-FORGE\comps:(OI)(CI)(F)
                      BUILTIN\Administrators:(I)(OI)(CI)(F)
                      NT AUTHORITY\SYSTEM:(I)(OI)(CI)(F)
                      BUILTIN\Users:(I)(OI)(CI)(RX)
                      NT AUTHORITY\Authenticated Users:(I)(M)
                      NT AUTHORITY\Authenticated Users:(I)(OI)(CI)(IO)(M)

Successfully processed 1 files; Failed processing 0 files
```

### PYTEST_ADDOPTS approach
Configured globally for commands in this run:
```powershell
$env:PYTEST_ADDOPTS='--basetemp=C:/Temp/pathos_pytest/basetemp -o cache_dir=C:/Temp/pathos_pytest/cache'
```

Note:
- Forward slashes were required in `PYTEST_ADDOPTS` on this Windows shell path to avoid malformed cache path parsing.
- Explicit ignores were also required to avoid collecting permission-restricted local folders:
  - `--ignore=data\pytest_tmp2`
  - `--ignore=.tmp\pytest-of-comps`
  - `--ignore=artifacts\pytest_tmp`
  - `--ignore=artifactspytest_cache`
  - `--ignore=artifactspytest_tmp`
  - `--ignore-glob=pytest-cache-files-*`

### Gates
#### poetry run ruff check .
```text
All checks passed!
```

#### poetry run mypy .
```text
Success: no issues found in 232 source files
```

#### poetry run pytest (full suite)
Command:
```powershell
poetry run pytest --ignore=data\pytest_tmp2 --ignore=.tmp\pytest-of-comps --ignore=artifacts\pytest_tmp --ignore=artifactspytest_cache --ignore=artifactspytest_tmp --ignore-glob=pytest-cache-files-*
```

Result:
```text
265 passed, 10 skipped in 264.28s (0:04:24)
Required test coverage of 90% reached. Total coverage: 90.70%
```

### OpenAPI snapshot drift fix
A prior full run failed only at `tests/test_openapi_snapshot_regression.py` after adding Day 60 contracts.
Resolution command run before final green pytest:
```powershell
poetry run python scripts/export_openapi.py
```

### Patch artifacts (this run)
Commands:
```powershell
git diff develop...HEAD > artifacts/day-60.patch
git diff > artifacts/day-60-this-run.patch
cmd /c dir artifacts
```

`cmd /c dir artifacts` output captured from this run:
```text
03/05/2026  04:14 PM            50,074 day-60-this-run.patch
03/05/2026  04:14 PM                 0 day-60.patch
...
```
## 2026-03-05 — Day 60 Ruff Format CI Fix (Changed-Files Check)

### Preflight
#### git status
```text
On branch feature/day-60-backend-snapshot-contract-pack-v1
Changes not staged for commit include the Day 60 snapshot files and docs; branch is up to date with origin.
Notable formatter-target files present as modified:
- app/api/v1/intelligence.py
- app/intelligence/snapshots/engine.py
- app/intelligence/snapshots/models.py
```

#### git branch --show-current
```text
feature/day-60-backend-snapshot-contract-pack-v1
```

#### git diff --name-status develop...HEAD
```text
Includes Day 60 additions/updates (snapshot module, router, tests, docs, openapi artifact).
```

#### git diff --stat develop...HEAD
```text
Large Day 60 delta remains; formatter fix was scoped only to requested files.
```

### Ruff format (only failing files)
Command:
```powershell
poetry run ruff format app/api/v1/intelligence.py app/intelligence/snapshots/engine.py app/intelligence/snapshots/models.py
```
Result:
```text
3 files left unchanged
```

### Ruff format check (target files)
Command:
```powershell
poetry run ruff format --check app/api/v1/intelligence.py app/intelligence/snapshots/engine.py app/intelligence/snapshots/models.py
```
Result:
```text
3 files already formatted
```

### CI helper parity
Command:
```powershell
poetry run python scripts/ci/ruff_format_check_changed.py
```
Result:
```text
Ruff format changed-files check base ref: develop
... (changed py files listed)
9 files already formatted
```

### Patch artifacts (this run)
Commands:
```powershell
git diff develop...HEAD > artifacts/day-60.patch
git diff > artifacts/day-60-this-run.patch
cmd /c dir artifacts
```

Directory listing excerpt:
```text
03/05/2026  04:39 PM             2,201 day-60-this-run.patch
03/05/2026  04:39 PM           224,769 day-60.patch
```
## 2026-03-25 - Backend Full Audit

### Summary
- Added the required backend audit artifacts:
  - `docs/audits/backend-full-audit.md`
  - `docs/audits/backend-gap-list.md`
  - `docs/change-briefs/backend-audit.md`
- Performed a production-readiness and architecture audit across API, deterministic logic, ingestion, persistence, worker flows, security/privacy, observability, testing, and deployment readiness.
- Verified the repo has a large real test suite, but also identified a critical validation caveat: the ambient shell environment had `PATHOS_ENV=PROD`, which causes broad startup-validation failures. With `PATHOS_ENV=local`, the full suite passed.

### Files changed
- `docs/audits/backend-full-audit.md`
- `docs/audits/backend-gap-list.md`
- `docs/change-briefs/backend-audit.md`

### Validation
#### poetry install --with dev --no-root
```text
Installing dependencies from lock file
Package operations: 48 installs, 0 updates, 0 removals
... completed successfully
```

#### poetry run ruff check .
```text
All checks passed!
```

#### poetry run mypy .
```text
Success: no issues found in 232 source files
```

#### poetry run pytest -q
```text
Failed in current shell environment.
Primary failure driver observed during audit:
- ambient PATHOS_ENV=PROD
- startup validation only accepts production/local/test/ci/staging/unknown/dev
- result: broad create_app()/startup validation failures before normal API tests could execute
- coverage gate then failed because the suite aborted into many early failures
```

#### $env:PATHOS_ENV='local'; poetry run pytest -q
```text
265 passed, 10 skipped in 178.67s (0:02:58)
Required test coverage of 90% reached. Total coverage: 90.70%
```

### Required git state
#### git status
```text
On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	new file:   docs/audits/backend-full-audit.md
	new file:   docs/audits/backend-gap-list.md
	new file:   docs/change-briefs/backend-audit.md
	modified:   docs/merge-notes/current.md

no changes added to commit (use "git add" and/or "git commit -a")
```

#### git branch --show-current
```text
main
```

#### git diff --name-status develop...HEAD
```text
fatal: ambiguous argument 'develop...HEAD': unknown revision or path not in the working tree.
Use '--' to separate paths from revisions, like this:
'git <command> [<revision>...] -- [<file>...]'
```

#### git diff --stat develop...HEAD
```text
fatal: ambiguous argument 'develop...HEAD': unknown revision or path not in the working tree.
Use '--' to separate paths from revisions, like this:
'git <command> [<revision>...] -- [<file>...]'
```

### Audit note on develop baseline
- This repository currently has only `main` locally and `origin/main` remotely.
- There is no local or remote `develop` ref available, so the exact required `develop...HEAD` commands fail in this repo state.
- I logged the exact command output above rather than silently substituting a different baseline.

### Working tree diff for this run
#### git diff --name-status
```text
A	apps/pathos-platform/backend/docs/audits/backend-full-audit.md
A	apps/pathos-platform/backend/docs/audits/backend-gap-list.md
A	apps/pathos-platform/backend/docs/change-briefs/backend-audit.md
M	apps/pathos-platform/backend/docs/merge-notes/current.md
```

#### git diff --stat
```text
 .../backend/docs/audits/backend-full-audit.md      | 562 +++++++++++++++++++++
 .../backend/docs/audits/backend-gap-list.md        |  71 +++
 .../backend/docs/change-briefs/backend-audit.md    |  51 ++
 .../backend/docs/merge-notes/current.md            | 120 ++++-
 4 files changed, 803 insertions(+), 1 deletion(-)
```

### Patch artifacts
Commands to run at end of audit:
```powershell
git diff develop...HEAD > artifacts/backend-audit.patch
git diff > artifacts/backend-audit-this-run.patch
bash -lc "ls -lh artifacts/backend-audit.patch artifacts/backend-audit-this-run.patch"
```

`bash -lc "ls -lh artifacts/backend-audit.patch artifacts/backend-audit-this-run.patch"` output:
```text
-rwxrwxrwx 1 joriel joriel 46K Mar 25 15:58 artifacts/backend-audit-this-run.patch
-rwxrwxrwx 1 joriel joriel   0 Mar 25 15:58 artifacts/backend-audit.patch
```
## 2026-03-25 - Backend Completion Roadmap

### Summary
- Added the backend completion planning artifacts:
  - `docs/audits/backend-completion-roadmap.md`
  - `docs/audits/usajobs-ingestion-v1-plan.md`
  - `docs/change-briefs/backend-completion-roadmap.md`
- Mapped the current backend codebase to the next implementation phases:
  - foundation hardening
  - bounded USAJOBS ingestion v1
  - deterministic qualification engine v1
  - evidence provenance/explainability v1
  - application decision + alert intelligence v1
- Kept this run planning-only. No broad feature implementation was done.

### Human Simulation Gate
| Item | Value |
|------|-------|
| Required | No |
| Triggers hit | none |
| Why | planning/docs-only run in backend repo; no UI/store/browser runtime flow changed |

### Files changed
- `docs/audits/backend-completion-roadmap.md`
- `docs/audits/usajobs-ingestion-v1-plan.md`
- `docs/change-briefs/backend-completion-roadmap.md`
- `docs/merge-notes/current.md`

### Required git state
#### git status
```text
On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	new file:   docs/audits/backend-full-audit.md
	new file:   docs/audits/backend-gap-list.md
	new file:   docs/change-briefs/backend-audit.md
	modified:   docs/merge-notes/current.md

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	docs/audits/backend-completion-roadmap.md
	docs/audits/usajobs-ingestion-v1-plan.md
	docs/change-briefs/backend-completion-roadmap.md

no changes added to commit (use "git add" and/or "git commit -a")
```

#### git branch --show-current
```text
main
```

#### git diff --name-status develop...HEAD
```text
fatal: ambiguous argument 'develop...HEAD': unknown revision or path not in the working tree.
Use '--' to separate paths from revisions, like this:
'git <command> [<revision>...] -- [<file>...]'
```

#### git diff --stat develop...HEAD
```text
fatal: ambiguous argument 'develop...HEAD': unknown revision or path not in the working tree.
Use '--' to separate paths from revisions, like this:
'git <command> [<revision>...] -- [<file>...]'
```

### Develop baseline note
- `develop` still does not exist in this repo state, locally or as a fetched remote ref.
- The required `develop...HEAD` commands therefore fail exactly as logged above.
- I did not silently substitute another baseline.

### Working tree diff after normalizing new files with intent-to-add
#### git status --short
```text
 A docs/audits/backend-completion-roadmap.md
 A docs/audits/backend-full-audit.md
 A docs/audits/backend-gap-list.md
 A docs/audits/usajobs-ingestion-v1-plan.md
 A docs/change-briefs/backend-audit.md
 A docs/change-briefs/backend-completion-roadmap.md
 M docs/merge-notes/current.md
```

#### git diff --name-status
```text
A	apps/pathos-platform/backend/docs/audits/backend-completion-roadmap.md
A	apps/pathos-platform/backend/docs/audits/backend-full-audit.md
A	apps/pathos-platform/backend/docs/audits/backend-gap-list.md
A	apps/pathos-platform/backend/docs/audits/usajobs-ingestion-v1-plan.md
A	apps/pathos-platform/backend/docs/change-briefs/backend-audit.md
A	apps/pathos-platform/backend/docs/change-briefs/backend-completion-roadmap.md
M	apps/pathos-platform/backend/docs/merge-notes/current.md
```

#### git diff --stat
```text
 .../docs/audits/backend-completion-roadmap.md      | 295 +++++++++++
 .../backend/docs/audits/backend-full-audit.md      | 562 +++++++++++++++++++++
 .../backend/docs/audits/backend-gap-list.md        |  71 +++
 .../docs/audits/usajobs-ingestion-v1-plan.md       | 140 +++++
 .../backend/docs/change-briefs/backend-audit.md    |  51 ++
 .../change-briefs/backend-completion-roadmap.md    |  47 ++
 .../backend/docs/merge-notes/current.md            | 123 ++++-
 7 files changed, 1288 insertions(+), 1 deletion(-)
```

### Patch artifacts
Commands:
```powershell
git diff develop...HEAD > artifacts/backend-completion-roadmap.patch
git diff > artifacts/backend-completion-roadmap-this-run.patch
bash -lc "ls -lh artifacts/backend-completion-roadmap.patch artifacts/backend-completion-roadmap-this-run.patch"
```

`bash -lc "ls -lh artifacts/backend-completion-roadmap.patch artifacts/backend-completion-roadmap-this-run.patch"` output:
```text
-rwxrwxrwx 1 joriel joriel 75K Mar 25 16:24 artifacts/backend-completion-roadmap-this-run.patch
-rwxrwxrwx 1 joriel joriel   0 Mar 25 16:24 artifacts/backend-completion-roadmap.patch
```
## 2026-03-25 - Phase 1 Backend Foundation Hardening

### Summary
- Created and switched to `feature/backend-foundation-hardening-v1`.
- Hardened API trust-boundary startup behavior so non-local API mode fails closed when `PATHOS_API_KEYS` is missing or obviously weak.
- Normalized `PATHOS_ENV` handling so aliases like `PROD` resolve to `production`, and pytest no longer inherits accidental shell `PATHOS_ENV` state.
- Gated deceptive placeholder runtime paths:
  - `/api/v1/intelligence/*` contract-pack snapshot stubs are now local-only and explicitly labeled in responses/logs
  - `email_digest_future` is now local-only and rejected outside local-style runtimes
- Added minimal production-shaped deployment/config artifacts:
  - `.env.example`
  - `Dockerfile`
  - `compose.yaml`
- Added/update docs for startup guardrails and Phase 1 trust posture.

### Human Simulation Gate
| Item | Value |
|------|-------|
| Required | No |
| Triggers hit | none |
| Why | backend-only runtime/config/auth/deployment hardening; no UI/browser/store flow changed in this repo |

### Files changed
- `README.md`
- `app/api/v1/alerts.py`
- `app/api/v1/desktop.py`
- `app/api/v1/intelligence.py`
- `app/core/config.py`
- `app/core/error_codes.py`
- `app/core/runtime_guards.py`
- `app/core/security.py`
- `app/core/startup_validation.py`
- `app/services/alert_rule_service.py`
- `app/services/delivery_transport_service.py`
- `tests/conftest.py`
- `tests/test_auth.py`
- `tests/test_health_readiness.py`
- `tests/test_intelligence_snapshot_contract_pack_v1.py`
- `tests/services/test_delivery_transport_service.py`
- `tests/api/alerts/test__categories__alerts.py`
- `.env.example`
- `Dockerfile`
- `compose.yaml`
- `docs/change-briefs/backend-foundation-hardening.md`
- `docs/ops/deployment-local-compose.md`
- `docs/runbook/backend-runbook-v1.md`

### Commands run
#### git checkout -b feature/backend-foundation-hardening-v1
```text
Switched to a new branch 'feature/backend-foundation-hardening-v1'
```

#### poetry run ruff check app tests README.md
```text
All checks passed!
```

#### poetry run mypy app tests
```text
Success: no issues found in 218 source files
```

#### poetry run pytest -q tests/test_auth.py tests/test_health_readiness.py tests/services/test_delivery_transport_service.py tests/test_intelligence_snapshot_contract_pack_v1.py tests/api/alerts/test__categories__alerts.py
```text
39 passed
ERROR: Coverage failure: total of 53 is less than fail-under=90
```

#### poetry run python -c "from app.main import create_app; app = create_app(mode='openapi'); print(app.title)"
```text
PathOS Backend
```

#### poetry run pytest -q
```text
273 passed, 10 skipped in 158.55s (0:02:38)
Required test coverage of 90% reached. Total coverage: 90.70%
```

#### poetry run python scripts/export_openapi.py
```text
(completed successfully; no stdout)
```

### Results
- Auth/config startup is stronger:
  - non-local API startup now requires configured API keys
  - short placeholder keys are rejected for non-local API startup
- Runtime env handling is more explicit:
  - `PROD` now normalizes to `production`
  - pytest forces `PATHOS_ENV=test` in `tests/conftest.py` instead of inheriting shell state
- Placeholder runtime behavior is now honest:
  - intelligence snapshot stubs are unavailable outside local-style runtimes
  - local responses include `X-PathOS-Intelligence-Status: stubbed-contract-v1-local-only`
  - placeholder email delivery is blocked outside local-style runtimes
- Deployment artifacts are materially better than before:
  - config template added
  - image build path added
  - compose path for API + worker added

### Known issues
- Full repo status still includes unrelated frontend changes in the parent workspace. I did not touch or revert those files.
- Auth remains shared-key based. Phase 1 hardened it materially, but it is not a full user/role authn/authz model.
- Intelligence snapshot endpoints are still stubs; Phase 1 only gated/labeled them honestly.

### Required git state
#### git status
```text
On branch feature/backend-foundation-hardening-v1
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   README.md
	modified:   app/api/v1/alerts.py
	modified:   app/api/v1/desktop.py
	modified:   app/api/v1/intelligence.py
	modified:   app/core/config.py
	modified:   app/core/error_codes.py
	modified:   app/core/security.py
	modified:   app/core/startup_validation.py
	modified:   app/services/alert_rule_service.py
	modified:   app/services/delivery_transport_service.py
	new file:   docs/audits/backend-completion-roadmap.md
	new file:   docs/audits/backend-full-audit.md
	new file:   docs/audits/backend-gap-list.md
	new file:   docs/audits/usajobs-ingestion-v1-plan.md
	new file:   docs/change-briefs/backend-audit.md
	new file:   docs/change-briefs/backend-completion-roadmap.md
	modified:   docs/merge-notes/current.md
	modified:   docs/ops/deployment-local-compose.md
	modified:   docs/runbook/backend-runbook-v1.md
	modified:   tests/api/alerts/test__categories__alerts.py
	modified:   tests/conftest.py
	modified:   tests/services/test_delivery_transport_service.py
	modified:   tests/test_auth.py
	modified:   tests/test_health_readiness.py
	modified:   tests/test_intelligence_snapshot_contract_pack_v1.py
	modified:   ../frontend/docs/merge-notes/current.md
	modified:   ../frontend/packages/ui/src/screens/ResumeBuilderScreen.tsx

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	.dockerignore
	Dockerfile
	app/core/runtime_guards.py
	compose.yaml
	docs/change-briefs/backend-foundation-hardening.md
	../frontend/docs/change-briefs/resume-builder-phase1.md
	../frontend/packages/ui/src/screens/ResumeBuilderScreen.test.tsx

no changes added to commit (use "git add" and/or "git commit -a")
```

#### git branch --show-current
```text
feature/backend-foundation-hardening-v1
```

#### git diff --name-status develop...HEAD
```text
fatal: ambiguous argument 'develop...HEAD': unknown revision or path not in the working tree.
Use '--' to separate paths from revisions, like this:
'git <command> [<revision>...] -- [<file>...]'
```

#### git diff --stat develop...HEAD
```text
fatal: ambiguous argument 'develop...HEAD': unknown revision or path not in the working tree.
Use '--' to separate paths from revisions, like this:
'git <command> [<revision>...] -- [<file>...]'
```

### Develop baseline note
- `develop` still does not exist in this repo state, so the required `develop...HEAD` commands fail exactly as logged above.
- I did not silently substitute another baseline.

### Working tree diff after intent-to-add normalization
#### git status --short
```text
 A .dockerignore
 A .env.example
 A Dockerfile
 M README.md
 M app/api/v1/alerts.py
 M app/api/v1/desktop.py
 M app/api/v1/intelligence.py
 M app/core/config.py
 M app/core/error_codes.py
 A app/core/runtime_guards.py
 M app/core/security.py
 M app/core/startup_validation.py
 M app/services/alert_rule_service.py
 M app/services/delivery_transport_service.py
 A compose.yaml
 A docs/audits/backend-completion-roadmap.md
 A docs/audits/backend-full-audit.md
 A docs/audits/backend-gap-list.md
 A docs/audits/usajobs-ingestion-v1-plan.md
 A docs/change-briefs/backend-audit.md
 A docs/change-briefs/backend-completion-roadmap.md
 A docs/change-briefs/backend-foundation-hardening.md
 M docs/merge-notes/current.md
 M docs/ops/deployment-local-compose.md
 M docs/runbook/backend-runbook-v1.md
 M tests/api/alerts/test__categories__alerts.py
 M tests/conftest.py
 M tests/services/test_delivery_transport_service.py
 M tests/test_auth.py
 M tests/test_health_readiness.py
 M tests/test_intelligence_snapshot_contract_pack_v1.py
 M ../frontend/docs/merge-notes/current.md
 M ../frontend/packages/ui/src/screens/ResumeBuilderScreen.tsx
?? ../frontend/docs/change-briefs/resume-builder-phase1.md
?? ../frontend/packages/ui/src/screens/ResumeBuilderScreen.test.tsx
```

#### git diff --name-status
```text
A	apps/pathos-platform/backend/.dockerignore
A	apps/pathos-platform/backend/.env.example
A	apps/pathos-platform/backend/Dockerfile
M	apps/pathos-platform/backend/README.md
M	apps/pathos-platform/backend/app/api/v1/alerts.py
M	apps/pathos-platform/backend/app/api/v1/desktop.py
M	apps/pathos-platform/backend/app/api/v1/intelligence.py
M	apps/pathos-platform/backend/app/core/config.py
M	apps/pathos-platform/backend/app/core/error_codes.py
A	apps/pathos-platform/backend/app/core/runtime_guards.py
M	apps/pathos-platform/backend/app/core/security.py
M	apps/pathos-platform/backend/app/core/startup_validation.py
M	apps/pathos-platform/backend/app/services/alert_rule_service.py
M	apps/pathos-platform/backend/app/services/delivery_transport_service.py
A	apps/pathos-platform/backend/compose.yaml
A	apps/pathos-platform/backend/docs/audits/backend-completion-roadmap.md
A	apps/pathos-platform/backend/docs/audits/backend-full-audit.md
A	apps/pathos-platform/backend/docs/audits/backend-gap-list.md
A	apps/pathos-platform/backend/docs/audits/usajobs-ingestion-v1-plan.md
A	apps/pathos-platform/backend/docs/change-briefs/backend-audit.md
A	apps/pathos-platform/backend/docs/change-briefs/backend-completion-roadmap.md
A	apps/pathos-platform/backend/docs/change-briefs/backend-foundation-hardening.md
M	apps/pathos-platform/backend/docs/merge-notes/current.md
M	apps/pathos-platform/backend/docs/ops/deployment-local-compose.md
M	apps/pathos-platform/backend/docs/runbook/backend-runbook-v1.md
M	apps/pathos-platform/backend/tests/api/alerts/test__categories__alerts.py
M	apps/pathos-platform/backend/tests/conftest.py
M	apps/pathos-platform/backend/tests/services/test_delivery_transport_service.py
M	apps/pathos-platform/backend/tests/test_auth.py
M	apps/pathos-platform/backend/tests/test_health_readiness.py
M	apps/pathos-platform/backend/tests/test_intelligence_snapshot_contract_pack_v1.py
M	apps/pathos-platform/frontend/docs/merge-notes/current.md
M	apps/pathos-platform/frontend/packages/ui/src/screens/ResumeBuilderScreen.tsx
```

#### git diff --stat
```text
 apps/pathos-platform/backend/.dockerignore         |   11 +
 apps/pathos-platform/backend/.env.example          |   39 +
 apps/pathos-platform/backend/Dockerfile            |   24 +
 apps/pathos-platform/backend/README.md             |  131 +-
 apps/pathos-platform/backend/app/api/v1/alerts.py  |    2 +
 apps/pathos-platform/backend/app/api/v1/desktop.py |    4 +-
 .../backend/app/api/v1/intelligence.py             |   26 +-
 apps/pathos-platform/backend/app/core/config.py    |   44 +-
 .../backend/app/core/error_codes.py                |    5 +
 .../backend/app/core/runtime_guards.py             |   19 +
 apps/pathos-platform/backend/app/core/security.py  |   13 +-
 .../backend/app/core/startup_validation.py         |   31 +-
 .../backend/app/services/alert_rule_service.py     |   15 +
 .../app/services/delivery_transport_service.py     |   28 +-
 apps/pathos-platform/backend/compose.yaml          |   47 +
 .../docs/audits/backend-completion-roadmap.md      |  295 ++
 .../backend/docs/audits/backend-full-audit.md      |  562 ++++
 .../backend/docs/audits/backend-gap-list.md        |   71 +
 .../docs/audits/usajobs-ingestion-v1-plan.md       |  140 +
 .../backend/docs/change-briefs/backend-audit.md    |   51 +
 .../change-briefs/backend-completion-roadmap.md    |   47 +
 .../change-briefs/backend-foundation-hardening.md  |   33 +
 .../backend/docs/merge-notes/current.md            |  246 +-
 .../backend/docs/ops/deployment-local-compose.md   |   22 +
 .../backend/docs/runbook/backend-runbook-v1.md     |   11 +
 .../tests/api/alerts/test__categories__alerts.py   |   27 +
 apps/pathos-platform/backend/tests/conftest.py     |    2 +-
 .../services/test_delivery_transport_service.py    |   17 +-
 apps/pathos-platform/backend/tests/test_auth.py    |   35 +
 .../backend/tests/test_health_readiness.py         |   21 +
 .../test_intelligence_snapshot_contract_pack_v1.py |   22 +
 .../frontend/docs/merge-notes/current.md           |   67 +
 .../ui/src/screens/ResumeBuilderScreen.tsx         | 2837 ++++++++++++++++----
 33 files changed, 4329 insertions(+), 616 deletions(-)
```

### Patch artifacts
Commands:
```powershell
git diff develop...HEAD > artifacts/phase-1-backend-foundation-hardening.patch
git diff > artifacts/phase-1-backend-foundation-hardening-this-run.patch
bash -lc "ls -lh artifacts/phase-1-backend-foundation-hardening.patch artifacts/phase-1-backend-foundation-hardening-this-run.patch"
```

`bash -lc "ls -lh artifacts/phase-1-backend-foundation-hardening.patch artifacts/phase-1-backend-foundation-hardening-this-run.patch"` output:
```text
-rwxrwxrwx 1 joriel joriel 251K Mar 25 18:03 artifacts/phase-1-backend-foundation-hardening-this-run.patch
-rwxrwxrwx 1 joriel joriel    0 Mar 25 18:03 artifacts/phase-1-backend-foundation-hardening.patch
```

### Phase 1 completion assessment
- Completed
  - non-local API startup now fails closed without real auth configuration
  - placeholder delivery mode is local-only
  - placeholder intelligence snapshot endpoints are local-only and explicitly labeled
  - startup env handling is more reliable and `PATHOS_ENV=PROD` no longer poisons runtime/tests
  - deployment/config artifacts are materially better than before
- Partially open
  - auth is still shared-key based rather than user/role scoped
  - real external delivery is still not implemented
  - real deterministic intelligence modules are still deferred
- Exact next phase
  - `git checkout -b feature/backend-usajobs-ingestion-v1`

### End-of-run summary
- Files changed: core config/security/startup, placeholder gating, tests, deployment docs/artifacts, merge-notes, change brief
- Tests run: lint, mypy, targeted pytest subset, full pytest, openapi export
- Phase 1 status: complete
- Recommended next branch: `git checkout -b feature/backend-usajobs-ingestion-v1`

## 2026-03-25 - Phase 2 - Backend USAJOBS Ingestion v1

### Summary of changes
- Implemented bounded canonical USAJOBS persistence through saved-search and alert-run execution paths instead of leaving runtime job results transient.
- Added warning-aware normalization and stronger provenance chaining: mapper version, upstream audit ID, upstream raw hash, query fingerprint, and bounded slice context now persist with ingested jobs.
- Added a dedicated bounded ingestion repo/service pair and mirrored migration support in both portable SQL and Alembic.
- Updated tests to target the new execution seam and added direct coverage for idempotent upsert behavior, official-source-only enforcement, mapper warning behavior, and provenance retention.
- Updated README and added a non-technical change brief for this phase.

### Files changed
- `app/adapters/usajobs/normalize.py`
- `app/services/job_search_service.py`
- `app/services/saved_search_runner_service.py`
- `app/services/alert_service.py`
- `app/services/usajobs_ingestion_service.py`
- `app/db/repo/upstream_audit_repo.py`
- `app/db/repo/saved_search_repo.py`
- `app/db/repo/saved_search_ingested_job_repo.py`
- `app/db/migrations/013_saved_search_ingested_jobs_v1.sql`
- `alembic/versions/20260325_000001_add_saved_search_ingested_jobs_table_v1.py`
- `app/services/wipe_service.py`
- `README.md`
- `docs/change-briefs/backend-usajobs-ingestion-v1.md`
- targeted test files under `tests/`

### Commands run
```powershell
poetry run ruff check app tests README.md
poetry run mypy app tests
poetry run pytest -q tests\api\jobs\test__positive__normalize.py tests\db\repo\test_saved_search_ingested_job_repo.py tests\services\test_usajobs_ingestion_service.py tests\services\test_saved_search_runner_service.py tests\api\alerts\test__categories__alerts.py tests\api\alerts\test__categories__alerts_run_v1.py tests\api\alerts\test__categories__alerts_observability_v1.py tests\edge_case\test_edge_case_testing_hardening_v1.py tests\use_case\test_use_case_testing_hardening_v1.py
poetry run pytest --no-cov -q tests\api\jobs\test__positive__normalize.py tests\db\repo\test_saved_search_ingested_job_repo.py tests\services\test_usajobs_ingestion_service.py tests\services\test_saved_search_runner_service.py tests\api\alerts\test__categories__alerts.py tests\api\alerts\test__categories__alerts_run_v1.py tests\api\alerts\test__categories__alerts_observability_v1.py tests\edge_case\test_edge_case_testing_hardening_v1.py tests\use_case\test_use_case_testing_hardening_v1.py
poetry run pytest -q
git status --short
git branch --show-current
git diff --name-status develop...HEAD
git diff --stat develop...HEAD
git diff develop...HEAD > artifacts/phase-2-backend-usajobs-ingestion.patch
git diff > artifacts/phase-2-backend-usajobs-ingestion-this-run.patch
bash -lc "ls -lh artifacts/phase-2-backend-usajobs-ingestion.patch artifacts/phase-2-backend-usajobs-ingestion-this-run.patch"
```

### Results
- `poetry run ruff check app tests README.md`
  - passed
- `poetry run mypy app tests`
  - passed
- targeted USAJOBS/ingestion pytest subset with coverage enabled
  - behavior passed, but the repo coverage gate failed as expected for a partial slice run: `33 passed`, total coverage `63.23%`, below fail-under `90`
- targeted USAJOBS/ingestion pytest subset without coverage
  - passed: `33 passed in 53.52s`
- full `poetry run pytest -q`
  - passed: `278 passed, 10 skipped`
  - coverage passed: `90.97%`
- live USAJOBS verification requests made during this run
  - `0`

### Known issues
- The feature branch already existed and was already checked out when this run started, so `git checkout -b feature/backend-usajobs-ingestion-v1` was not re-run.
- `git diff develop...HEAD` is empty in this repo state because the Phase 2 work is still entirely uncommitted on the current feature branch. The cumulative patch file is therefore `0` bytes.
- There are unrelated frontend worktree changes present in the parent repo. They were left untouched.
- No live USAJOBS API verification call was used. The adapter path remains validated through fixtures/mocks plus the existing official-API client implementation.

### Git state
#### git status
```text
 M README.md
 M app/adapters/usajobs/normalize.py
 M app/db/repo/saved_search_repo.py
 M app/db/repo/upstream_audit_repo.py
 M app/services/alert_service.py
 M app/services/job_search_service.py
 M app/services/saved_search_runner_service.py
 M app/services/wipe_service.py
 M tests/api/alerts/test__categories__alerts.py
 M tests/api/alerts/test__categories__alerts_observability_v1.py
 M tests/api/alerts/test__categories__alerts_run_v1.py
 M tests/api/jobs/test__positive__normalize.py
 M tests/edge_case/test_edge_case_testing_hardening_v1.py
 M tests/services/test_saved_search_runner_service.py
 M tests/test_alembic_migrations.py
 M tests/test_log_event_registry_and_schema.py
 M tests/use_case/test_use_case_testing_hardening_v1.py
 M ../frontend/docs/merge-notes/current.md
 M ../frontend/packages/ui/src/screens/ResumeBuilderScreen.tsx
?? alembic/versions/20260325_000001_add_saved_search_ingested_jobs_table_v1.py
?? app/db/migrations/013_saved_search_ingested_jobs_v1.sql
?? app/db/repo/saved_search_ingested_job_repo.py
?? app/services/usajobs_ingestion_service.py
?? docs/change-briefs/backend-usajobs-ingestion-v1.md
?? tests/db/repo/test_saved_search_ingested_job_repo.py
?? tests/services/test_usajobs_ingestion_service.py
?? tests/usajobs_execution_helper.py
?? ../frontend/docs/change-briefs/resume-builder-phase1.md
?? ../frontend/docs/change-briefs/resume-builder-phase2.md
?? ../frontend/packages/ui/src/screens/ResumeBuilderScreen.test.tsx
```

#### git branch --show-current
```text
feature/backend-usajobs-ingestion-v1
```

#### git diff --name-status develop...HEAD
```text
```

#### git diff --stat develop...HEAD
```text
```

### Patch artifacts
Commands:
```powershell
git diff develop...HEAD > artifacts/phase-2-backend-usajobs-ingestion.patch
git diff > artifacts/phase-2-backend-usajobs-ingestion-this-run.patch
bash -lc "ls -lh artifacts/phase-2-backend-usajobs-ingestion.patch artifacts/phase-2-backend-usajobs-ingestion-this-run.patch"
```

`bash -lc "ls -lh artifacts/phase-2-backend-usajobs-ingestion.patch artifacts/phase-2-backend-usajobs-ingestion-this-run.patch"` output:
```text
-rwxrwxrwx 1 joriel joriel 244K Mar 25 18:50 artifacts/phase-2-backend-usajobs-ingestion-this-run.patch
-rwxrwxrwx 1 joriel joriel    0 Mar 25 18:50 artifacts/phase-2-backend-usajobs-ingestion.patch
```

## Phase 2 completion assessment
- Completed
  - bounded official-USAJOBS ingestion now exists as a real runtime capability through saved-search and alert-run flows
  - canonical mapping now emits deterministic warning metadata instead of silently flattening malformed upstream fields
  - provenance is materially stronger: official source identity, mapper version, query fingerprint, upstream audit ID, upstream raw hash, and bounded slice context are preserved
  - idempotent upsert behavior is implemented for bounded canonical records
  - checkpoint and alert-run infrastructure now sits on stable canonical persistence instead of only transient search results
- Partially open
  - bounded ingestion is run-driven, not yet exposed through a dedicated operator-facing sync command or runbook section beyond README guidance
  - no live quota-consuming integration proof was executed in this run, by design
  - qualification and recommendation intelligence still do not exist; this phase only prepared the data foundation
- Ready for Phase 3 deterministic qualification engine v1
  - yes

### End-of-run summary
- Files changed: USAJOBS normalization, job-search execution, bounded ingestion repo/service/migrations, saved-search and alert-run ingestion hooks, tests, README, merge-notes, change brief
- Tests run: ruff, mypy, targeted pytest subset with and without coverage, full pytest
- Phase 2 status: complete
- Recommended next branch: `git checkout -b feature/backend-qualification-engine-v1`

## 2026-06-30 - Sync Job Staging Validation Slice

### Summary
- Added staging-safe USAJOBS sync validation support on top of the existing saved-search ingestion path.
- Added `job_sync_runs` and `job_change_log` persistence for health and meaningful change tracking.
- Added dry-run support that fetches and normalizes official USAJOBS data without writing staging records or upstream raw audit rows.
- Added a bounded staging CLI for series `2210`, Florida, last 7 days, max 1-2 pages.
- Added fixture tests for new ingestion, repeat idempotency, raw snapshot preservation, content hash behavior, canonical field comparison, salary/location/remote/closing-date/document/qualification changes, closed lifecycle handling, failed partition handling, duplicate prevention, and telework not being treated as fully remote.
- Added staging runbook and non-technical change brief.

### Human Simulation Gate
| Item | Value |
|------|-------|
| Required | No |
| Triggers hit | none |
| Why | Backend sync, repository, CLI, and documentation work only; no browser UI, navigation, hydration, or localStorage flow changed. |

### AI Acceptance Checklist
| Item | Value |
|------|-------|
| Flow | Official USAJOBS API fetch -> JobSearchService normalization -> USAJobsIngestionService dry-run or bounded write -> saved_search_ingested_jobs/job_sync_runs/job_change_log -> ops health output |
| Store(s) | None |
| Storage key(s) | None |
| Failure mode | Staging could misread duplicate, stale, changed, or closed jobs before production sync validation. |
| How tested | Deterministic pytest fixtures, ruff, mypy, migration tests; full pytest attempted but timed out after 244 seconds. |

### Validation Commands
```text
poetry run ruff check .
Result: passed, All checks passed!

poetry run pytest -q tests/services/test_usajobs_ingestion_service.py tests/db/repo/test_saved_search_ingested_job_repo.py tests/services/test_saved_search_runner_service.py tests/api/jobs/test__positive__normalize.py tests/api/jobs/test__categories__jobs_search.py --cov=app --cov-fail-under=0
Result: passed, 27 passed in 36.60s

poetry run mypy app tests
Result: passed, Success: no issues found in 224 source files

poetry run pytest -q tests/test_alembic_migrations.py --cov=app --cov-fail-under=0
Result: passed, 1 passed, 1 skipped in 7.15s

poetry run pytest -q tests/test_migrations_runner.py --cov=app --cov-fail-under=0
Result: passed, 3 passed in 8.79s

poetry run pytest -q
Result: not completed; command timed out after 244 seconds before returning output.
```

### Git Status
```text
On branch feature/backend-usajobs-ingestion-v1
Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
	modified:   README.md
	new file:   alembic/versions/20260325_000001_add_saved_search_ingested_jobs_table_v1.py
	modified:   app/adapters/usajobs/normalize.py
	new file:   app/db/migrations/013_saved_search_ingested_jobs_v1.sql
	new file:   app/db/repo/saved_search_ingested_job_repo.py
	modified:   app/db/repo/saved_search_repo.py
	modified:   app/db/repo/upstream_audit_repo.py
	modified:   app/services/alert_service.py
	modified:   app/services/job_search_service.py
	modified:   app/services/saved_search_runner_service.py
	new file:   app/services/usajobs_ingestion_service.py
	modified:   app/services/wipe_service.py
	new file:   docs/change-briefs/backend-usajobs-ingestion-v1.md
	modified:   docs/merge-notes/current.md
	modified:   tests/api/alerts/test__categories__alerts.py
	modified:   tests/api/alerts/test__categories__alerts_observability_v1.py
	modified:   tests/api/alerts/test__categories__alerts_run_v1.py
	modified:   tests/api/jobs/test__positive__normalize.py
	new file:   tests/db/repo/test_saved_search_ingested_job_repo.py
	modified:   tests/edge_case/test_edge_case_testing_hardening_v1.py
	modified:   tests/services/test_saved_search_runner_service.py
	new file:   tests/services/test_usajobs_ingestion_service.py
	modified:   tests/test_alembic_migrations.py
	modified:   tests/test_log_event_registry_and_schema.py
	new file:   tests/usajobs_execution_helper.py
	modified:   tests/use_case/test_use_case_testing_hardening_v1.py
	new file:   ../frontend/docs/change-briefs/resume-builder-phase1.md
	new file:   ../frontend/docs/change-briefs/resume-builder-phase2.md
	new file:   ../frontend/docs/change-briefs/resume-builder-ux-compression.md
	modified:   ../frontend/docs/merge-notes/current.md
	new file:   ../frontend/packages/ui/src/screens/ResumeBuilderScreen.test.tsx
	modified:   ../frontend/packages/ui/src/screens/ResumeBuilderScreen.tsx
	new file:   ../../../restructure-safety/backend-path-status.txt
	new file:   ../../../restructure-safety/backend-repo-branch.txt
	new file:   ../../../restructure-safety/backend-repo-remotes.txt
	new file:   ../../../restructure-safety/backend-repo-status.txt
	new file:   ../../../restructure-safety/frontend-path-status.txt
	new file:   ../../../restructure-safety/frontend-repo-branch.txt
	new file:   ../../../restructure-safety/frontend-repo-remotes.txt
	new file:   ../../../restructure-safety/frontend-repo-status.txt
	new file:   ../../../restructure-safety/root-branch.txt
	new file:   ../../../restructure-safety/root-full-status.txt
	new file:   ../../../restructure-safety/root-log.txt
	new file:   ../../../restructure-safety/root-remotes.txt
	new file:   ../../../restructure-safety/root-status-after-split.txt
	new file:   ../../../restructure-safety/root-status.txt
	new file:   ../../../restructure-safety/snapshot-timestamp.txt
	new file:   ../../../restructure-safety/split-validation-summary.json

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   README.md
	modified:   alembic/versions/20260325_000001_add_saved_search_ingested_jobs_table_v1.py
	modified:   app/api/v1/ops.py
	modified:   app/db/migrations/013_saved_search_ingested_jobs_v1.sql
	new file:   app/db/repo/job_sync_run_repo.py
	modified:   app/db/repo/saved_search_ingested_job_repo.py
	modified:   app/models/job_search.py
	modified:   app/services/job_search_service.py
	modified:   app/services/usajobs_ingestion_service.py
	new file:   docs/change-briefs/sync-job-staging-validation.md
	new file:   docs/runbook/usajobs-sync-staging-validation.md
	new file:   scripts/usajobs_staging_validation.py
	modified:   tests/db/repo/test_saved_search_ingested_job_repo.py
	modified:   tests/services/test_usajobs_ingestion_service.py

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	../../../usajobs-sync.env.ps1
```

### Branch
```text
feature/backend-usajobs-ingestion-v1
```

### git diff --name-status develop...HEAD
```text

```

### git diff --stat develop...HEAD
```text

```

### Patch Artifacts
```text
artifacts/sync-job-staging-validation.patch - 0 bytes
artifacts/sync-job-staging-validation-this-run.patch - 83K
```

### Notes
- `git diff develop...HEAD` is empty because this slice is uncommitted working-tree work layered on the current feature branch.
- `git add -N .` was used before patch generation so new files are represented in `git diff` without committing.
- Existing unrelated frontend and restructure-safety intent-to-add entries were already present in the broader worktree and were not modified for this slice.
- No production scheduler setting was changed.
- No live email delivery or external indexing submission was enabled.
- No USAJOBS scraping was added.

### Final git state refresh
#### git status
```text
 M README.md
 M app/adapters/usajobs/normalize.py
 M app/db/repo/saved_search_repo.py
 M app/db/repo/upstream_audit_repo.py
 M app/services/alert_service.py
 M app/services/job_search_service.py
 M app/services/saved_search_runner_service.py
 M app/services/wipe_service.py
 M docs/merge-notes/current.md
 M tests/api/alerts/test__categories__alerts.py
 M tests/api/alerts/test__categories__alerts_observability_v1.py
 M tests/api/alerts/test__categories__alerts_run_v1.py
 M tests/api/jobs/test__positive__normalize.py
 M tests/edge_case/test_edge_case_testing_hardening_v1.py
 M tests/services/test_saved_search_runner_service.py
 M tests/test_alembic_migrations.py
 M tests/test_log_event_registry_and_schema.py
 M tests/use_case/test_use_case_testing_hardening_v1.py
 M ../frontend/docs/merge-notes/current.md
 M ../frontend/packages/ui/src/screens/ResumeBuilderScreen.tsx
?? alembic/versions/20260325_000001_add_saved_search_ingested_jobs_table_v1.py
?? app/db/migrations/013_saved_search_ingested_jobs_v1.sql
?? app/db/repo/saved_search_ingested_job_repo.py
?? app/services/usajobs_ingestion_service.py
?? docs/change-briefs/backend-usajobs-ingestion-v1.md
?? tests/db/repo/test_saved_search_ingested_job_repo.py
?? tests/services/test_usajobs_ingestion_service.py
?? tests/usajobs_execution_helper.py
?? ../frontend/docs/change-briefs/resume-builder-phase1.md
?? ../frontend/docs/change-briefs/resume-builder-phase2.md
?? ../frontend/docs/change-briefs/resume-builder-ux-compression.md
?? ../frontend/packages/ui/src/screens/ResumeBuilderScreen.test.tsx
```

#### patch artifact sizes
```text
-rwxrwxrwx 1 joriel joriel 257K Mar 25 18:52 artifacts/phase-2-backend-usajobs-ingestion-this-run.patch
-rwxrwxrwx 1 joriel joriel    0 Mar 25 18:52 artifacts/phase-2-backend-usajobs-ingestion.patch
```
## 2026-07-01 - Day 46 Checkpoint And Production-Readiness Roadmap

### Branch
```text
feature/backend-usajobs-ingestion-v1
```

### Scope
- Checkpoint the current USAJOBS sync staging-validation slice without fixing the known review blockers.
- Regenerate patch artifacts before commit.
- Preserve the review verdict: not merge-ready.
- Add `docs/roadmaps/usajobs-sync-production-readiness-days.md` for Day 47 through Day 56 follow-up work.
- Make tiny documentation hygiene edits so the runbook and change brief do not overstate dry-run safety before Day 47.

### Known Merge Blockers Preserved
- Dry-run can still mutate staging on upstream error paths because upstream audit records may be written when `record_upstream_audit=False`.
- Staging write mode is not environment-gated.
- Alert/indexing behavior is documented as queue-only, but the implementation currently appears to store counters rather than persisted deduped queue rows.
- Production canonical USAJOBS jobs do not yet prove all fields tested by fixture-only dictionaries.

### Known Should-Fix Items Preserved
- Dry-run output marks every fetched item as new and is weak for staging idempotency validation.
- Remote/telework classification should prefer explicit USAJOBS remote indicators.
- Closed-job handling must be guarded against partial partitions.
- Health endpoint needs direct tests for auth, no-row, populated-row, and sanitized-error cases.
- Schema integrity should be hardened with relationships, indexes, and constraints where appropriate.

### Pre-Commit Git State
```text
git status
Result: branch feature/backend-usajobs-ingestion-v1 with backend USAJOBS sync validation changes plus unrelated pre-existing staged frontend/restructure-safety files. Those unrelated files are intentionally excluded from this checkpoint commit.

git branch --show-current
Result: feature/backend-usajobs-ingestion-v1

git diff --name-status
Result: 15 backend slice files changed:
M apps/pathos-platform/backend/README.md
M apps/pathos-platform/backend/alembic/versions/20260325_000001_add_saved_search_ingested_jobs_table_v1.py
M apps/pathos-platform/backend/app/api/v1/ops.py
M apps/pathos-platform/backend/app/db/migrations/013_saved_search_ingested_jobs_v1.sql
A apps/pathos-platform/backend/app/db/repo/job_sync_run_repo.py
M apps/pathos-platform/backend/app/db/repo/saved_search_ingested_job_repo.py
M apps/pathos-platform/backend/app/models/job_search.py
M apps/pathos-platform/backend/app/services/job_search_service.py
M apps/pathos-platform/backend/app/services/usajobs_ingestion_service.py
A apps/pathos-platform/backend/docs/change-briefs/sync-job-staging-validation.md
M apps/pathos-platform/backend/docs/merge-notes/current.md
A apps/pathos-platform/backend/docs/runbook/usajobs-sync-staging-validation.md
A apps/pathos-platform/backend/scripts/usajobs_staging_validation.py
M apps/pathos-platform/backend/tests/db/repo/test_saved_search_ingested_job_repo.py
M apps/pathos-platform/backend/tests/services/test_usajobs_ingestion_service.py

git diff --stat
Result: 15 files changed, 1555 insertions(+), 42 deletions(-)
```

### Validation Commands
```text
poetry run ruff check .
Result: passed, All checks passed!

poetry run mypy app tests
Result: passed, Success: no issues found in 224 source files

poetry run pytest tests/services/test_usajobs_ingestion_service.py tests/db/repo/test_saved_search_ingested_job_repo.py tests/services/test_saved_search_runner_service.py tests/api/jobs/test__positive__normalize.py tests/api/jobs/test__categories__jobs_search.py -q --cov=app --cov-fail-under=0
Result: passed, 27 passed in 39.35s

poetry run pytest tests/test_alembic_migrations.py tests/test_migrations_runner.py -q --cov=app --cov-fail-under=0
Result: passed, 4 passed, 1 skipped in 16.33s

poetry run pytest -q --maxfail=1
Result: timed out after 248 seconds with no failure surfaced before timeout.
Prior collection evidence: pytest collection previously completed and collected 297 tests.
Recommended next narrow command: poetry run pytest --no-cov -vv --durations=20 --maxfail=1 tests
```

### Patch Artifacts Before Commit
```text
artifacts/sync-job-staging-validation.patch: 0 bytes
artifacts/sync-job-staging-validation-this-run.patch: 84723 bytes
```

Note: the cumulative `develop...HEAD` artifact is 0 bytes before commit because the work is still uncommitted. Regenerate patch artifacts after the checkpoint commit.

### Production-Readiness Roadmap
- Added `docs/roadmaps/usajobs-sync-production-readiness-days.md`.
- Next recommended continuation prompt: Day 47 dry-run safety and environment gates.

### Merge Readiness
- Status: not merge-ready.
- Do not open a PR, merge, enable production scheduler changes, enable real email delivery, or enable external indexing submissions from this checkpoint.
