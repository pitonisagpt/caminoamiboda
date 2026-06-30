"""add tentative date fields to reservations

Revision ID: 0028
Revises: 0027
Create Date: 2026-06-30
"""
from alembic import op
import sqlalchemy as sa

revision = '0028'
down_revision = '0027'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('reservations', sa.Column('is_tentative', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('reservations', sa.Column('event_date_notes', sa.String(255), nullable=True))


def downgrade():
    op.drop_column('reservations', 'event_date_notes')
    op.drop_column('reservations', 'is_tentative')
