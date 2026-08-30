"""create reservation_addons table

Revision ID: 0071
Revises: 0070
Create Date: 2026-08-30
"""
from alembic import op
import sqlalchemy as sa

revision = '0071'
down_revision = '0070'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'reservation_addons',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('reservation_id', sa.Integer(), sa.ForeignKey('reservations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('addon_package_id', sa.Integer(), sa.ForeignKey('addon_packages.id', ondelete='SET NULL'), nullable=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('provider_name', sa.String(120), nullable=True),
        sa.Column('price', sa.Numeric(12, 2), nullable=False),
        sa.Column('company_percentage', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('company_collects_payment', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_reservation_addons_reservation_id', 'reservation_addons', ['reservation_id'])
    op.create_index('ix_reservation_addons_addon_package_id', 'reservation_addons', ['addon_package_id'])


def downgrade():
    op.drop_table('reservation_addons')
