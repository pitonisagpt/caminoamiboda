"""drop start_time/end_time from reservations

Revision ID: 0061
Revises: 0060
Create Date: 2026-08-15
"""
from alembic import op
import sqlalchemy as sa

revision = "0061"
down_revision = "0060"
branch_labels = None
depends_on = None


def upgrade():
    op.drop_column("reservations", "start_time")
    op.drop_column("reservations", "end_time")


def downgrade():
    op.add_column("reservations", sa.Column("end_time", sa.Time(), nullable=True))
    op.add_column("reservations", sa.Column("start_time", sa.Time(), nullable=True))
