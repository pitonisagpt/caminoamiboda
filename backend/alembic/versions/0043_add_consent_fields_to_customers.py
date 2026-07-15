"""add consent audit fields to customers

Revision ID: 0043
Revises: 0042
Create Date: 2026-07-14
"""
from alembic import op
import sqlalchemy as sa

revision = '0043'
down_revision = '0042'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('customers', sa.Column('consent_accepted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('customers', sa.Column('consent_ip', sa.String(64), nullable=True))
    op.add_column('customers', sa.Column('consent_policy_version', sa.String(20), nullable=True))


def downgrade():
    op.drop_column('customers', 'consent_policy_version')
    op.drop_column('customers', 'consent_ip')
    op.drop_column('customers', 'consent_accepted_at')
