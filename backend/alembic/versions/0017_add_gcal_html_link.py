"""add gcal_html_link to event_timelines

Revision ID: 0017
Revises: 0016
Create Date: 2026-06-25
"""
from alembic import op
import sqlalchemy as sa

revision = '0017'
down_revision = '0016'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('event_timelines',
        sa.Column('gcal_html_link', sa.String(500), nullable=True))


def downgrade():
    op.drop_column('event_timelines', 'gcal_html_link')
