"""add company_name to vehicle_owners

Revision ID: 0050
Revises: 0049
Create Date: 2026-07-28
"""
from alembic import op
import sqlalchemy as sa

revision = "0050"
down_revision = "0049"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("vehicle_owners", sa.Column("company_name", sa.String(255), nullable=True))


def downgrade():
    op.drop_column("vehicle_owners", "company_name")
