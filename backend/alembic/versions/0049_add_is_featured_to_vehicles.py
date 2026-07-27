"""add is_featured to vehicles

Revision ID: 0049
Revises: 0048
Create Date: 2026-07-27
"""
from alembic import op
import sqlalchemy as sa

revision = "0049"
down_revision = "0048"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "vehicles",
        sa.Column("is_featured", sa.Boolean(), nullable=False, server_default="false"),
    )


def downgrade():
    op.drop_column("vehicles", "is_featured")
