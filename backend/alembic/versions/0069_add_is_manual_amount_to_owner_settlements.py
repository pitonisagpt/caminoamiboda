"""add is_manual_amount to owner_settlements

Revision ID: 0069
Revises: 0068
Create Date: 2026-08-26
"""
from alembic import op
import sqlalchemy as sa

revision = '0069'
down_revision = '0068'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('owner_settlements', sa.Column('is_manual_amount', sa.Boolean(), nullable=False, server_default='false'))


def downgrade():
    op.drop_column('owner_settlements', 'is_manual_amount')
