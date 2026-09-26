"""add schedule_availability, usage_location, authorized_routes to reservation_contracts

Revision ID: 0079
Revises: 0078
Create Date: 2026-09-26

Same free-text-slot pattern as authorized_use/special_conditions (0073) —
these three fall back to a value computed from the reservation's timeline
when left blank, but can be overridden per reservation.
"""
from alembic import op
import sqlalchemy as sa

revision = '0079'
down_revision = '0078'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('reservation_contracts', sa.Column('schedule_availability', sa.Text(), nullable=True))
    op.add_column('reservation_contracts', sa.Column('usage_location', sa.Text(), nullable=True))
    op.add_column('reservation_contracts', sa.Column('authorized_routes', sa.Text(), nullable=True))


def downgrade():
    op.drop_column('reservation_contracts', 'authorized_routes')
    op.drop_column('reservation_contracts', 'usage_location')
    op.drop_column('reservation_contracts', 'schedule_availability')
