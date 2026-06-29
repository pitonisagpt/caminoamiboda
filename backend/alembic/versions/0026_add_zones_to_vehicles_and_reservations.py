"""add zones to vehicles and reservations

Revision ID: 0026
Revises: 0025
Create Date: 2026-06-28
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0026"
down_revision = "0025"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "vehicles",
        sa.Column("allowed_locations", postgresql.JSONB(), nullable=True),
    )
    op.add_column(
        "reservations",
        sa.Column("event_location", sa.String(50), nullable=True),
    )


def downgrade():
    op.drop_column("vehicles", "allowed_locations")
    op.drop_column("reservations", "event_location")
