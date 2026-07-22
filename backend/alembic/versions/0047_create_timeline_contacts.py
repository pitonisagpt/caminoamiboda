"""create timeline_contacts table

Revision ID: 0047
Revises: 0046
Create Date: 2026-07-21
"""
from alembic import op
import sqlalchemy as sa

revision = "0047"
down_revision = "0046"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "timeline_contacts",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("timeline_id", sa.Integer(), sa.ForeignKey("event_timelines.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("role", sa.String(100), nullable=True),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_table("timeline_contacts")
