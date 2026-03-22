"""Add db_migration_audit table for migration traceability.

Revision ID: 20260223_000002
Revises: 20260223_000001
Create Date: 2026-02-23
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260223_000002"
down_revision = "20260223_000001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create migration audit log table and deterministic index."""
    op.create_table(
        "db_migration_audit",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("applied_at", sa.Text(), nullable=False),
        sa.Column("db_revision", sa.Text(), nullable=True),
        sa.Column("alembic_head", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("environment", sa.Text(), nullable=False),
        sa.Column("service_version", sa.Text(), nullable=False),
        sa.Column("details_json", sa.Text(), nullable=True),
        if_not_exists=True,
    )
    op.create_index(
        "idx_db_migration_audit_applied_at",
        "db_migration_audit",
        ["applied_at"],
        if_not_exists=True,
    )


def downgrade() -> None:
    """Drop migration audit table and index."""
    op.drop_index("idx_db_migration_audit_applied_at", table_name="db_migration_audit")
    op.drop_table("db_migration_audit")
