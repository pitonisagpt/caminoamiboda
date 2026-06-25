"""add assigned_driver_phone to event_timelines

Revision ID: 0011
Revises: 0010
Create Date: 2026-06-24
"""
from alembic import op
import sqlalchemy as sa

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "event_timelines",
        sa.Column("assigned_driver_phone", sa.String(50), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("event_timelines", "assigned_driver_phone")
