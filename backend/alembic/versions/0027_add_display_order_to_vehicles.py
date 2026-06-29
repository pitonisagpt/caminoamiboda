"""add display_order to vehicles

Revision ID: 0027
Revises: 0026
Create Date: 2026-06-29
"""
from alembic import op
import sqlalchemy as sa

revision = "0027"
down_revision = "0026"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "vehicles",
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
    )
    # Populate with sequential values matching current brand/model_line order
    op.execute("""
        UPDATE vehicles SET display_order = sub.rn
        FROM (
            SELECT id, ROW_NUMBER() OVER (ORDER BY brand, model_line) AS rn
            FROM vehicles
        ) sub
        WHERE vehicles.id = sub.id
    """)


def downgrade():
    op.drop_column("vehicles", "display_order")
