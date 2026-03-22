"""Slice 86 baseline migration scaffold.

Revision ID: 20260222_000001
Revises:
Create Date: 2026-02-22
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260222_000001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Baseline migration that mirrors the sqlite migration schema for Postgres."""
    # These tables match the sqlite migration runner outputs so Alembic can
    # bootstrap Postgres with the same baseline schema used in tests.
    op.create_table(
        "saved_searches",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("filters_json", sa.Text(), nullable=False),
        sa.Column("is_enabled", sa.Boolean(), nullable=False),
        sa.Column("last_run_at", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        # These columns are added in init_db for sqlite; include them here for parity.
        sa.Column("query_payload", sa.Text(), nullable=True),
        sa.Column("profile_payload", sa.Text(), nullable=True),
        sa.Column("ruleset_version", sa.Text(), nullable=True),
    )

    op.create_table(
        "alert_rules",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column(
            "saved_search_id",
            sa.Text(),
            sa.ForeignKey("saved_searches.id"),
            nullable=False,
        ),
        sa.Column("min_score_threshold", sa.Integer(), nullable=False),
        sa.Column("max_per_day", sa.Integer(), nullable=False),
        sa.Column("cooldown_hours", sa.Integer(), nullable=False),
        sa.Column("delivery_mode", sa.Text(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
    )
    op.create_index("idx_alert_rules_enabled", "alert_rules", ["enabled"])
    op.create_index("idx_alert_rules_saved_search", "alert_rules", ["saved_search_id"])

    op.create_table(
        "alert_delivery_log",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column(
            "alert_rule_id", sa.Text(), sa.ForeignKey("alert_rules.id"), nullable=False
        ),
        sa.Column("job_id", sa.Text(), nullable=False),
        sa.Column("first_seen_at", sa.Text(), nullable=False),
        sa.Column("last_seen_at", sa.Text(), nullable=False),
        sa.Column("last_score", sa.Integer(), nullable=False),
        sa.Column("notified_at", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
        sa.UniqueConstraint(
            "alert_rule_id", "job_id", name="uq_alert_delivery_rule_job"
        ),
    )
    op.create_index(
        "idx_alert_delivery_rule_job", "alert_delivery_log", ["alert_rule_id", "job_id"]
    )
    op.create_index(
        "idx_alert_delivery_rule_notified",
        "alert_delivery_log",
        ["alert_rule_id", "notified_at"],
    )

    op.create_table(
        "alert_runs",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("started_at", sa.Text(), nullable=False),
        sa.Column("ended_at", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("rules_evaluated", sa.Integer(), nullable=False),
        sa.Column("jobs_scanned", sa.Integer(), nullable=False),
        sa.Column("triggers_count", sa.Integer(), nullable=False),
        sa.Column("error_summary", sa.Text(), nullable=True),
        # Delivery worker metrics (defaults mirror sqlite ALTER TABLE statements).
        sa.Column(
            "usajobs_fetch_ms",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "normalize_ms", sa.Integer(), nullable=False, server_default=sa.text("0")
        ),
        sa.Column(
            "score_ms", sa.Integer(), nullable=False, server_default=sa.text("0")
        ),
        sa.Column(
            "delta_ms", sa.Integer(), nullable=False, server_default=sa.text("0")
        ),
        sa.Column(
            "digest_ms", sa.Integer(), nullable=False, server_default=sa.text("0")
        ),
        sa.Column(
            "suppressed_count",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "backoff_events_json",
            sa.Text(),
            nullable=False,
            server_default=sa.text("'[]'"),
        ),
        sa.Column(
            "lock_acquired", sa.Integer(), nullable=False, server_default=sa.text("0")
        ),
        sa.Column(
            "lock_released", sa.Integer(), nullable=False, server_default=sa.text("0")
        ),
        # Skip telemetry fields added in later sqlite migrations.
        sa.Column("skip_reason", sa.Text(), nullable=True),
        sa.Column("skip_details", sa.Text(), nullable=True),
    )
    op.create_index("idx_alert_runs_started_at", "alert_runs", ["started_at"])

    op.create_table(
        "alert_scheduler_locks",
        sa.Column("lock_name", sa.Text(), primary_key=True),
        sa.Column("owner_run_id", sa.Text(), nullable=False),
        sa.Column("acquired_at", sa.Text(), nullable=False),
        sa.Column("expires_at", sa.Text(), nullable=False),
    )
    op.create_index(
        "idx_alert_scheduler_locks_expires", "alert_scheduler_locks", ["expires_at"]
    )


def downgrade() -> None:
    """Drop baseline tables in reverse order to satisfy FK constraints."""
    op.drop_index(
        "idx_alert_scheduler_locks_expires", table_name="alert_scheduler_locks"
    )
    op.drop_table("alert_scheduler_locks")

    op.drop_index("idx_alert_runs_started_at", table_name="alert_runs")
    op.drop_table("alert_runs")

    op.drop_index("idx_alert_delivery_rule_notified", table_name="alert_delivery_log")
    op.drop_index("idx_alert_delivery_rule_job", table_name="alert_delivery_log")
    op.drop_table("alert_delivery_log")

    op.drop_index("idx_alert_rules_saved_search", table_name="alert_rules")
    op.drop_index("idx_alert_rules_enabled", table_name="alert_rules")
    op.drop_table("alert_rules")

    op.drop_table("saved_searches")
