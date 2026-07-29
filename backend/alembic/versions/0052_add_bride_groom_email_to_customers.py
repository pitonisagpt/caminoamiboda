"""add bride_email and groom_email to customers

Revision ID: 0052
Revises: 0051
Create Date: 2026-07-28
"""
from alembic import op
import sqlalchemy as sa

revision = "0052"
down_revision = "0051"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("customers", sa.Column("bride_email", sa.String(255), nullable=True))
    op.add_column("customers", sa.Column("groom_email", sa.String(255), nullable=True))


def downgrade():
    op.drop_column("customers", "groom_email")
    op.drop_column("customers", "bride_email")
