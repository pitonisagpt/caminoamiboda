"""add category to vehicles

Revision ID: 0055
Revises: 0054
Create Date: 2026-08-02
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0055"
down_revision = "0054"
branch_labels = None
depends_on = None

category_enum = postgresql.ENUM("clasico", "vintage", "moderno", name="vehiclecategory")


def upgrade():
    category_enum.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "vehicles",
        sa.Column("category", category_enum, nullable=True),
    )


def downgrade():
    op.drop_column("vehicles", "category")
    op.execute("DROP TYPE IF EXISTS vehiclecategory")
