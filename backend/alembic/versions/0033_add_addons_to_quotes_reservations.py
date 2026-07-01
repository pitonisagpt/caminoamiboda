"""add addon fields to quotes and reservations

Revision ID: 0033
Revises: 0032
Create Date: 2026-06-30
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0033'
down_revision = '0032'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('quotes', sa.Column('extra_hours', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('quotes', sa.Column('addon_package_ids', postgresql.JSONB(), nullable=True, server_default='[]'))
    op.add_column('quotes', sa.Column('addons_total', sa.Numeric(12, 2), nullable=False, server_default='0'))

    op.add_column('reservations', sa.Column('extra_hours', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('reservations', sa.Column('addon_package_ids', postgresql.JSONB(), nullable=True, server_default='[]'))
    op.add_column('reservations', sa.Column('addons_total', sa.Numeric(12, 2), nullable=False, server_default='0'))


def downgrade():
    op.drop_column('reservations', 'addons_total')
    op.drop_column('reservations', 'addon_package_ids')
    op.drop_column('reservations', 'extra_hours')
    op.drop_column('quotes', 'addons_total')
    op.drop_column('quotes', 'addon_package_ids')
    op.drop_column('quotes', 'extra_hours')
