"""add owner_id to vehicles

Revision ID: 0048
Revises: 0047
Create Date: 2026-07-27
"""
from alembic import op
import sqlalchemy as sa

revision = "0048"
down_revision = "0047"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("vehicles", sa.Column("owner_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_vehicles_owner_id", "vehicles", "vehicle_owners",
        ["owner_id"], ["id"], ondelete="SET NULL",
    )
    # Backfill: link every vehicle whose free-text owner_name matches an
    # existing VehicleOwner exactly. Vehicles with no match keep owner_id NULL
    # and their legacy owner_name/owner_contact text untouched — the owner
    # decided not to auto-create or merge owner records by guessing.
    op.execute("""
        UPDATE vehicles SET owner_id = vo.id
        FROM vehicle_owners vo
        WHERE vehicles.owner_name = vo.full_name
    """)


def downgrade() -> None:
    op.drop_constraint("fk_vehicles_owner_id", "vehicles", type_="foreignkey")
    op.drop_column("vehicles", "owner_id")
