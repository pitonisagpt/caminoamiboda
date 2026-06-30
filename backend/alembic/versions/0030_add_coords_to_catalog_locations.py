"""add lat/lng to catalog_locations

Revision ID: 0030
Revises: 0029
Create Date: 2026-06-30
"""
from alembic import op
import sqlalchemy as sa

revision = '0030'
down_revision = '0029'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('catalog_locations', sa.Column('lat', sa.Double(), nullable=True))
    op.add_column('catalog_locations', sa.Column('lng', sa.Double(), nullable=True))


def downgrade():
    op.drop_column('catalog_locations', 'lng')
    op.drop_column('catalog_locations', 'lat')
