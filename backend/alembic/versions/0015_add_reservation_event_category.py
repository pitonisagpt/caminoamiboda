"""add event_category and gcal_imported to reservations

Revision ID: 0015
Revises: 0014
"""
import sqlalchemy as sa
from alembic import op

revision = "0015"
down_revision = "0014"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "reservations",
        sa.Column("event_category", sa.String(20), nullable=False, server_default="standard"),
    )
    op.add_column(
        "reservations",
        sa.Column("gcal_imported", sa.Boolean, nullable=False, server_default="false"),
    )


def downgrade():
    op.drop_column("reservations", "gcal_imported")
    op.drop_column("reservations", "event_category")
