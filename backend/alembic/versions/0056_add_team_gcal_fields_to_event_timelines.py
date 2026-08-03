"""add team gcal tracking fields to event_timelines

Revision ID: 0056
Revises: 0055
Create Date: 2026-08-03
"""
from alembic import op
import sqlalchemy as sa

revision = "0056"
down_revision = "0055"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("event_timelines", sa.Column("gcal_team_event_id", sa.String(200), nullable=True))
    op.add_column("event_timelines", sa.Column("gcal_team_calendar_id", sa.String(200), nullable=True))
    op.add_column("event_timelines", sa.Column("gcal_team_html_link", sa.String(500), nullable=True))
    op.add_column("event_timelines", sa.Column("gcal_team_invited_at", sa.DateTime(timezone=True), nullable=True))


def downgrade():
    op.drop_column("event_timelines", "gcal_team_invited_at")
    op.drop_column("event_timelines", "gcal_team_html_link")
    op.drop_column("event_timelines", "gcal_team_calendar_id")
    op.drop_column("event_timelines", "gcal_team_event_id")
