"""add gcal_event_id to event_timelines

Revision ID: 0013
Revises: 0012
Create Date: 2026-06-25
"""
from alembic import op
import sqlalchemy as sa

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "event_timelines",
        sa.Column("gcal_event_id", sa.String(200), nullable=True),
    )


def downgrade():
    op.drop_column("event_timelines", "gcal_event_id")
