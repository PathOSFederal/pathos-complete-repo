"""Add telemetry_metrics table for bounded beta telemetry counters.

Revision ID: 20260223_000003
Revises: 20260223_000002
Create Date: 2026-02-23
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260223_000003"
down_revision = "20260223_000002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create telemetry metrics table and deterministic updated-at index."""
    op.create_table(
        "telemetry_metrics",
        sa.Column("metric_key", sa.Text(), primary_key=True),
        sa.Column("count", sa.Integer(), nullable=False),
        sa.Column("total_duration_ms", sa.Integer(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        if_not_exists=True,
    )
    op.create_index(
        "idx_telemetry_metrics_updated_at",
        "telemetry_metrics",
        ["updated_at"],
        if_not_exists=True,
    )


def downgrade() -> None:
    """Drop telemetry table and index."""
    op.drop_index("idx_telemetry_metrics_updated_at", table_name="telemetry_metrics")
    op.drop_table("telemetry_metrics")
