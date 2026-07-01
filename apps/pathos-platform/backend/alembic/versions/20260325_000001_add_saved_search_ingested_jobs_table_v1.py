"""Add saved_search_ingested_jobs table for bounded USAJOBS provenance storage.

Revision ID: 20260325_000001
Revises: 20260223_000003
Create Date: 2026-03-25
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260325_000001"
down_revision = "20260223_000003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "saved_search_ingested_jobs",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("saved_search_id", sa.Text(), nullable=False),
        sa.Column("job_id", sa.Text(), nullable=False),
        sa.Column("source", sa.Text(), nullable=False),
        sa.Column("source_slice_json", sa.Text(), nullable=False),
        sa.Column("mapper_version", sa.Text(), nullable=False),
        sa.Column("query_fingerprint", sa.Text(), nullable=False),
        sa.Column("upstream_audit_id", sa.Text(), nullable=True),
        sa.Column("upstream_raw_hash", sa.Text(), nullable=True),
        sa.Column("canonical_job_sha256", sa.Text(), nullable=False),
        sa.Column("canonical_job_json", sa.Text(), nullable=False),
        sa.Column("ingest_warnings_json", sa.Text(), nullable=False),
        sa.Column("lifecycle_state", sa.Text(), nullable=False, server_default="open"),
        sa.Column("closed_at", sa.Text(), nullable=True),
        sa.Column("first_ingested_at", sa.Text(), nullable=False),
        sa.Column("last_ingested_at", sa.Text(), nullable=False),
        sa.Column("last_seen_at", sa.Text(), nullable=False),
        sa.Column("last_changed_at", sa.Text(), nullable=False),
        sa.Column("unchanged_run_count", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(
            ["saved_search_id"],
            ["saved_searches.id"],
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint(
            "saved_search_id",
            "job_id",
            name="uq_saved_search_ingested_jobs_saved_search_job",
        ),
        if_not_exists=True,
    )
    op.create_index(
        "idx_saved_search_ingested_jobs_search_seen",
        "saved_search_ingested_jobs",
        ["saved_search_id", "last_seen_at"],
        if_not_exists=True,
    )
    op.create_index(
        "idx_saved_search_ingested_jobs_query_fingerprint",
        "saved_search_ingested_jobs",
        ["query_fingerprint"],
        if_not_exists=True,
    )
    op.create_table(
        "job_sync_runs",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("saved_search_id", sa.Text(), nullable=True),
        sa.Column("source", sa.Text(), nullable=False),
        sa.Column("trigger_mode", sa.Text(), nullable=False),
        sa.Column("run_mode", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("started_at", sa.Text(), nullable=False),
        sa.Column("completed_at", sa.Text(), nullable=False),
        sa.Column("records_fetched", sa.Integer(), nullable=False),
        sa.Column("new_jobs", sa.Integer(), nullable=False),
        sa.Column("updated_jobs", sa.Integer(), nullable=False),
        sa.Column("unchanged_jobs", sa.Integer(), nullable=False),
        sa.Column("closed_jobs", sa.Integer(), nullable=False),
        sa.Column("failed_partitions_json", sa.Text(), nullable=False),
        sa.Column("stale_partitions_json", sa.Text(), nullable=False),
        sa.Column("alert_events_queued", sa.Integer(), nullable=False),
        sa.Column("indexing_events_queued", sa.Integer(), nullable=False),
        sa.Column("duration_ms", sa.Integer(), nullable=False),
        sa.Column("error_summary", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(
            ["saved_search_id"],
            ["saved_searches.id"],
            ondelete="SET NULL",
        ),
        if_not_exists=True,
    )
    op.create_table(
        "job_change_log",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("sync_run_id", sa.Text(), nullable=True),
        sa.Column("saved_search_id", sa.Text(), nullable=False),
        sa.Column("job_id", sa.Text(), nullable=False),
        sa.Column("change_type", sa.Text(), nullable=False),
        sa.Column("changed_fields_json", sa.Text(), nullable=False),
        sa.Column("previous_hash", sa.Text(), nullable=True),
        sa.Column("new_hash", sa.Text(), nullable=True),
        sa.Column("source_slice_json", sa.Text(), nullable=False),
        sa.Column("upstream_audit_id", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(
            ["saved_search_id"],
            ["saved_searches.id"],
            ondelete="CASCADE",
        ),
        if_not_exists=True,
    )
    op.create_index(
        "idx_job_sync_runs_completed",
        "job_sync_runs",
        ["completed_at"],
        if_not_exists=True,
    )
    op.create_index(
        "idx_job_change_log_search_created",
        "job_change_log",
        ["saved_search_id", "created_at"],
        if_not_exists=True,
    )


def downgrade() -> None:
    op.drop_index("idx_job_change_log_search_created", table_name="job_change_log")
    op.drop_index("idx_job_sync_runs_completed", table_name="job_sync_runs")
    op.drop_table("job_change_log")
    op.drop_table("job_sync_runs")
    op.drop_index(
        "idx_saved_search_ingested_jobs_query_fingerprint",
        table_name="saved_search_ingested_jobs",
    )
    op.drop_index(
        "idx_saved_search_ingested_jobs_search_seen",
        table_name="saved_search_ingested_jobs",
    )
    op.drop_table("saved_search_ingested_jobs")
