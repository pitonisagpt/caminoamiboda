"""add start_time and end_time to reservations

Revision ID: 0020
Revises: 0019
Create Date: 2026-06-26
"""

from alembic import op
import sqlalchemy as sa

revision = "0020"
down_revision = "0019"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("reservations", sa.Column("start_time", sa.Time(), nullable=True))
    op.add_column("reservations", sa.Column("end_time", sa.Time(), nullable=True))


def downgrade():
    op.drop_column("reservations", "end_time")
    op.drop_column("reservations", "start_time")
