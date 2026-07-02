"""Add USAJOBS sync event queue tables.

Revision ID: 20260326_000001
Revises: 20260325_000001
Create Date: 2026-03-26
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260326_000001"
down_revision = "20260325_000001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "job_alert_events",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("sync_run_id", sa.Text(), nullable=False),
        sa.Column("saved_search_id", sa.Text(), nullable=True),
        sa.Column("source_job_id", sa.Text(), nullable=False),
        sa.Column("canonical_job_id", sa.Text(), nullable=False),
        sa.Column("event_type", sa.Text(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("payload_summary_json", sa.Text(), nullable=False),
        sa.Column("dedupe_key", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default="queued"),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(
            ["sync_run_id"],
            ["job_sync_runs.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["saved_search_id"],
            ["saved_searches.id"],
            ondelete="SET NULL",
        ),
        sa.UniqueConstraint("dedupe_key", name="uq_job_alert_events_dedupe_key"),
        if_not_exists=True,
    )
    op.create_table(
        "job_page_indexing_events",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("sync_run_id", sa.Text(), nullable=False),
        sa.Column("saved_search_id", sa.Text(), nullable=True),
        sa.Column("source_job_id", sa.Text(), nullable=False),
        sa.Column("canonical_job_id", sa.Text(), nullable=False),
        sa.Column("event_type", sa.Text(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("payload_summary_json", sa.Text(), nullable=False),
        sa.Column("dedupe_key", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default="queued"),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(
            ["sync_run_id"],
            ["job_sync_runs.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["saved_search_id"],
            ["saved_searches.id"],
            ondelete="SET NULL",
        ),
        sa.UniqueConstraint("dedupe_key", name="uq_job_page_indexing_events_dedupe_key"),
        if_not_exists=True,
    )
    for table_name in ("job_alert_events", "job_page_indexing_events"):
        prefix = "idx_" + table_name
        op.create_index(prefix + "_sync_run", table_name, ["sync_run_id"], if_not_exists=True)
        op.create_index(prefix + "_status", table_name, ["status"], if_not_exists=True)
        op.create_index(prefix + "_type", table_name, ["event_type"], if_not_exists=True)
        op.create_index(prefix + "_job", table_name, ["source_job_id"], if_not_exists=True)
        op.create_index(
            prefix + "_canonical_job",
            table_name,
            ["canonical_job_id"],
            if_not_exists=True,
        )
        op.create_index(prefix + "_saved_search", table_name, ["saved_search_id"], if_not_exists=True)


def downgrade() -> None:
    for table_name in ("job_page_indexing_events", "job_alert_events"):
        prefix = "idx_" + table_name
        op.drop_index(prefix + "_saved_search", table_name=table_name)
        op.drop_index(prefix + "_job", table_name=table_name)
        op.drop_index(prefix + "_canonical_job", table_name=table_name)
        op.drop_index(prefix + "_type", table_name=table_name)
        op.drop_index(prefix + "_status", table_name=table_name)
        op.drop_index(prefix + "_sync_run", table_name=table_name)
        op.drop_table(table_name)
