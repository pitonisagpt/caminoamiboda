"""add client_type to billing_documents

Revision ID: 0044
Revises: 0043
Create Date: 2026-07-15
"""
from alembic import op
import sqlalchemy as sa

revision = '0044'
down_revision = '0043'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('billing_documents', sa.Column('client_type', sa.String(20), nullable=False, server_default='individual'))
    op.add_column('billing_documents', sa.Column('client_legal_rep_name', sa.String(255), nullable=True))


def downgrade():
    op.drop_column('billing_documents', 'client_legal_rep_name')
    op.drop_column('billing_documents', 'client_type')
