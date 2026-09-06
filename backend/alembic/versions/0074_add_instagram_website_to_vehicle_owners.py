"""add instagram and website to vehicle_owners

Revision ID: 0074
Revises: 0073
Create Date: 2026-09-05
"""
from alembic import op
import sqlalchemy as sa

revision = '0074'
down_revision = '0073'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('vehicle_owners', sa.Column('instagram', sa.String(100), nullable=True))
    op.add_column('vehicle_owners', sa.Column('website', sa.String(255), nullable=True))


def downgrade():
    op.drop_column('vehicle_owners', 'website')
    op.drop_column('vehicle_owners', 'instagram')
