"""add cancellation_reason to reservations

Revision ID: 0051
Revises: 0050
Create Date: 2026-07-28
"""
from alembic import op
import sqlalchemy as sa

revision = "0051"
down_revision = "0050"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("reservations", sa.Column("cancellation_reason", sa.Text(), nullable=True))


def downgrade():
    op.drop_column("reservations", "cancellation_reason")
