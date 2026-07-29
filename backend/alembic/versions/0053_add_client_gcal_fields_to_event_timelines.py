"""add client-facing gcal tracking fields to event_timelines

Revision ID: 0053
Revises: 0052
Create Date: 2026-07-28
"""
from alembic import op
import sqlalchemy as sa

revision = "0053"
down_revision = "0052"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("event_timelines", sa.Column("gcal_client_event_id", sa.String(200), nullable=True))
    op.add_column("event_timelines", sa.Column("gcal_client_calendar_id", sa.String(200), nullable=True))
    op.add_column("event_timelines", sa.Column("gcal_client_html_link", sa.String(500), nullable=True))
    op.add_column("event_timelines", sa.Column("gcal_client_invited_at", sa.DateTime(timezone=True), nullable=True))


def downgrade():
    op.drop_column("event_timelines", "gcal_client_invited_at")
    op.drop_column("event_timelines", "gcal_client_html_link")
    op.drop_column("event_timelines", "gcal_client_calendar_id")
    op.drop_column("event_timelines", "gcal_client_event_id")
