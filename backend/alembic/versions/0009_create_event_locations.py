"""create event_locations table

Revision ID: 0009
Revises: 0008
Create Date: 2026-06-24
"""
from alembic import op
import sqlalchemy as sa

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "event_locations",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("timeline_id", sa.Integer(), sa.ForeignKey("event_timelines.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("location_name", sa.String(255), nullable=False),
        sa.Column("location_type", sa.Enum("pickup", "ceremony", "reception", "photoshoot", "other", name="locationtype"), nullable=False, server_default="other"),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("google_maps_link", sa.String(500), nullable=True),
        sa.Column("contact_person", sa.String(255), nullable=True),
        sa.Column("contact_phone", sa.String(50), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_table("event_locations")
    op.execute("DROP TYPE IF EXISTS locationtype")
