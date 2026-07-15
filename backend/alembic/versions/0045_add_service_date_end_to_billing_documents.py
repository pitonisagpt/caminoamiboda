"""add service_date_end to billing_documents

Revision ID: 0045
Revises: 0044
Create Date: 2026-07-15
"""
from alembic import op
import sqlalchemy as sa

revision = '0045'
down_revision = '0044'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('billing_documents', sa.Column('service_date_end', sa.Date(), nullable=True))


def downgrade():
    op.drop_column('billing_documents', 'service_date_end')
