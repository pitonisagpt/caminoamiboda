"""add multi-calendar fields to event_timelines

Revision ID: 0016
Revises: 0015
"""
import sqlalchemy as sa
from alembic import op

revision = "0016"
down_revision = "0015"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "event_timelines",
        sa.Column("calendar_category", sa.String(20), nullable=False, server_default="prospectos"),
    )
    op.add_column(
        "event_timelines",
        sa.Column("gcal_calendar_id", sa.String(200), nullable=True),
    )
    op.add_column(
        "event_timelines",
        sa.Column("gcal_imported", sa.Boolean, nullable=False, server_default="false"),
    )
    op.add_column(
        "event_timelines",
        sa.Column(
            "reservation_id",
            sa.Integer,
            sa.ForeignKey("reservations.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )


def downgrade():
    op.drop_column("event_timelines", "reservation_id")
    op.drop_column("event_timelines", "gcal_imported")
    op.drop_column("event_timelines", "gcal_calendar_id")
    op.drop_column("event_timelines", "calendar_category")
