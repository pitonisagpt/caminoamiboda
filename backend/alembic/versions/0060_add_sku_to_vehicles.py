"""add sku to vehicles

Revision ID: 0060
Revises: 0059
Create Date: 2026-08-13
"""
from alembic import op
import sqlalchemy as sa

revision = "0060"
down_revision = "0059"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("vehicles", sa.Column("sku", sa.String(length=20), nullable=True))
    op.execute("""
        WITH numbered AS (
          SELECT id, 'CAB-' || LPAD(ROW_NUMBER() OVER (ORDER BY id)::text, 3, '0') AS sku
          FROM vehicles
        )
        UPDATE vehicles SET sku = numbered.sku FROM numbered WHERE vehicles.id = numbered.id
    """)
    op.alter_column("vehicles", "sku", nullable=False)
    op.create_unique_constraint("uq_vehicles_sku", "vehicles", ["sku"])


def downgrade():
    op.drop_constraint("uq_vehicles_sku", "vehicles", type_="unique")
    op.drop_column("vehicles", "sku")
