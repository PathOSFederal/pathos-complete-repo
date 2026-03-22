"""Shared SQLAlchemy metadata for Alembic-managed schema migrations.

This module intentionally defines only metadata scaffolding for Slice 86.
Subsequent slices can attach table definitions to this metadata object.
"""

from sqlalchemy import MetaData

metadata = MetaData()
target_metadata = metadata
