"""add bride_description to vehicles

Revision ID: 0054
Revises: 0053
Create Date: 2026-07-29
"""
from alembic import op
import sqlalchemy as sa

revision = "0054"
down_revision = "0053"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("vehicles", sa.Column("bride_description", sa.Text(), nullable=True))


def downgrade():
    op.drop_column("vehicles", "bride_description")
