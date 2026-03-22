"""Add alert_digests table for Postgres parity.

Revision ID: 20260223_000001
Revises: 20260222_000001
Create Date: 2026-02-23
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260223_000001"
down_revision = "20260222_000001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create alert_digests table and indexes for Postgres."""
    # WHY: Postgres CI uses Alembic migrations, while sqlite uses a SQL runner.
    #      The sqlite migration 007_delta_digest_observability_v1.sql creates
    #      alert_digests, so we mirror it here to keep repo behavior consistent.
    # HOW: Use Text columns for timestamps to match the sqlite schema approach
    #      used in the baseline migration and repo expectations.
    # NOTE: Some dev/Postgres environments may already have alert_digests from
    #       prior manual schema setup. if_not_exists keeps the migration safe
    #       while still applying in fresh CI databases.
    op.create_table(
        "alert_digests",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column(
            "alert_run_id",
            sa.Text(),
            sa.ForeignKey("alert_runs.id"),
            nullable=False,
        ),
        sa.Column(
            "alert_rule_id",
            sa.Text(),
            sa.ForeignKey("alert_rules.id"),
            nullable=False,
        ),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("delivery_mode", sa.Text(), nullable=False),
        sa.Column("payload_json", sa.Text(), nullable=False),
        if_not_exists=True,
    )
    op.create_index(
        "idx_alert_digests_rule_created",
        "alert_digests",
        ["alert_rule_id", "created_at"],
        if_not_exists=True,
    )
    op.create_index(
        "idx_alert_digests_run",
        "alert_digests",
        ["alert_run_id"],
        if_not_exists=True,
    )


def downgrade() -> None:
    """Drop alert_digests table and indexes."""
    op.drop_index("idx_alert_digests_run", table_name="alert_digests")
    op.drop_index("idx_alert_digests_rule_created", table_name="alert_digests")
    op.drop_table("alert_digests")
