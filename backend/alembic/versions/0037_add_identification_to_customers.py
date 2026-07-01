"""add identification_number to customers

Revision ID: 0037
Revises: 0036
Create Date: 2026-07-01
"""
from alembic import op
import sqlalchemy as sa

revision = '0037'
down_revision = '0036'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('customers', sa.Column('identification_number', sa.String(50), nullable=True))


def downgrade():
    op.drop_column('customers', 'identification_number')
