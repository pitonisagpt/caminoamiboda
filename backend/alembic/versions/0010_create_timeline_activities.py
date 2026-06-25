"""create timeline_activities table

Revision ID: 0010
Revises: 0009
Create Date: 2026-06-24
"""
from alembic import op
import sqlalchemy as sa

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "timeline_activities",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("timeline_id", sa.Integer(), sa.ForeignKey("event_timelines.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("location_id", sa.Integer(), sa.ForeignKey("event_locations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("time", sa.String(10), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("estimated_duration", sa.String(50), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_table("timeline_activities")
