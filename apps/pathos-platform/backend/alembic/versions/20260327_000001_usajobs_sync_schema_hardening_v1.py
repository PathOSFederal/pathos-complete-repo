"""Harden USAJOBS sync indexes for schema validation.

Revision ID: 20260327_000001
Revises: 20260326_000001
Create Date: 2026-03-27
"""

from __future__ import annotations

from alembic import op

revision = "20260327_000001"
down_revision = "20260326_000001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "idx_job_change_log_sync_run",
        "job_change_log",
        ["sync_run_id"],
        if_not_exists=True,
    )
    op.create_index(
        "idx_job_change_log_change_type",
        "job_change_log",
        ["change_type"],
        if_not_exists=True,
    )
    op.create_index(
        "idx_job_change_log_job",
        "job_change_log",
        ["job_id"],
        if_not_exists=True,
    )
    op.create_index(
        "idx_saved_search_ingested_jobs_lifecycle",
        "saved_search_ingested_jobs",
        ["lifecycle_state"],
        if_not_exists=True,
    )
    op.create_index(
        "idx_saved_search_ingested_jobs_job",
        "saved_search_ingested_jobs",
        ["job_id"],
        if_not_exists=True,
    )
    op.create_index(
        "idx_job_sync_runs_status",
        "job_sync_runs",
        ["status"],
        if_not_exists=True,
    )
    op.create_index(
        "idx_job_sync_runs_source_status",
        "job_sync_runs",
        ["source", "status"],
        if_not_exists=True,
    )


def downgrade() -> None:
    op.drop_index("idx_job_sync_runs_source_status", table_name="job_sync_runs")
    op.drop_index("idx_job_sync_runs_status", table_name="job_sync_runs")
    op.drop_index("idx_saved_search_ingested_jobs_job", table_name="saved_search_ingested_jobs")
    op.drop_index(
        "idx_saved_search_ingested_jobs_lifecycle",
        table_name="saved_search_ingested_jobs",
    )
    op.drop_index("idx_job_change_log_job", table_name="job_change_log")
    op.drop_index("idx_job_change_log_change_type", table_name="job_change_log")
    op.drop_index("idx_job_change_log_sync_run", table_name="job_change_log")
