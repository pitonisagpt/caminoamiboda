"""add day_number to timeline_activities

Revision ID: 0042
Revises: 0041
Create Date: 2026-07-14
"""
from alembic import op
import sqlalchemy as sa

revision = '0042'
down_revision = '0041'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('timeline_activities', sa.Column('day_number', sa.Integer(), nullable=False, server_default='1'))


def downgrade():
    op.drop_column('timeline_activities', 'day_number')
