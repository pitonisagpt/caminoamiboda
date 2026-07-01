"""add pico y placa override fields to vehicles

Revision ID: 0034
Revises: 0033
Create Date: 2026-06-30
"""
from alembic import op
import sqlalchemy as sa

revision = '0034'
down_revision = '0033'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('vehicles', sa.Column('pyp_day_override', sa.String(20), nullable=True))
    op.add_column('vehicles', sa.Column('pyp_valid_from', sa.Date(), nullable=True))
    op.add_column('vehicles', sa.Column('pyp_valid_to', sa.Date(), nullable=True))


def downgrade():
    op.drop_column('vehicles', 'pyp_valid_to')
    op.drop_column('vehicles', 'pyp_valid_from')
    op.drop_column('vehicles', 'pyp_day_override')
