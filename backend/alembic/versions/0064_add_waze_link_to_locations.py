"""add waze_link to event_locations and catalog_locations

Revision ID: 0064
Revises: 0063
Create Date: 2026-08-22
"""
from alembic import op
import sqlalchemy as sa

revision = '0064'
down_revision = '0063'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('event_locations', sa.Column('waze_link', sa.String(500), nullable=True))
    op.add_column('catalog_locations', sa.Column('waze_link', sa.String(500), nullable=True))


def downgrade():
    op.drop_column('catalog_locations', 'waze_link')
    op.drop_column('event_locations', 'waze_link')
