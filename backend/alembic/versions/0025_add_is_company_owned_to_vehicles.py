"""add is_company_owned to vehicles

Revision ID: 0025
Revises: 0024
Create Date: 2026-06-28
"""
from alembic import op
import sqlalchemy as sa

revision = "0025"
down_revision = "0024"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "vehicles",
        sa.Column("is_company_owned", sa.Boolean(), nullable=False, server_default="false"),
    )


def downgrade():
    op.drop_column("vehicles", "is_company_owned")
