"""add payment_type and withholding_percentage to reservation_payments

Revision ID: 0063
Revises: 0062
Create Date: 2026-08-20
"""
from alembic import op
import sqlalchemy as sa

revision = '0063'
down_revision = '0062'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'reservation_payments',
        sa.Column('payment_type', sa.String(20), nullable=False, server_default='cash'),
    )
    op.add_column(
        'reservation_payments',
        sa.Column('withholding_percentage', sa.Numeric(5, 2), nullable=True),
    )


def downgrade():
    op.drop_column('reservation_payments', 'withholding_percentage')
    op.drop_column('reservation_payments', 'payment_type')
