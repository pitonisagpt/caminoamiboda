"""add road_access_notes to event_locations

Revision ID: 0038
Revises: 0037
Create Date: 2026-07-01
"""
from alembic import op
import sqlalchemy as sa

revision = '0038'
down_revision = '0037'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('event_locations', sa.Column('road_access_notes', sa.Text(), nullable=True))


def downgrade():
    op.drop_column('event_locations', 'road_access_notes')
