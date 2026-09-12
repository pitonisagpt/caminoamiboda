"""add reservation_addon_payments

Revision ID: 0077
Revises: 0076
Create Date: 2026-09-12

Mirrors owner_settlement_payments (0018-era) exactly, but against
reservation_addons instead of owner_settlements — tracks how much of a
third-party service's provider_amount has actually been paid out,
which reservation_addons itself never recorded (wishlist fila 35).
"""
from alembic import op
import sqlalchemy as sa

revision = '0077'
down_revision = '0076'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'reservation_addon_payments',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('addon_id', sa.Integer(), sa.ForeignKey('reservation_addons.id', ondelete='CASCADE'), nullable=False),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('paid_at', sa.Date(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_reservation_addon_payments_addon_id', 'reservation_addon_payments', ['addon_id'])


def downgrade():
    op.drop_index('ix_reservation_addon_payments_addon_id', table_name='reservation_addon_payments')
    op.drop_table('reservation_addon_payments')
