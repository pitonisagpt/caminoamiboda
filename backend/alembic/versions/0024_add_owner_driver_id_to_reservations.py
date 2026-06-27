"""add owner_driver_id to reservations

Revision ID: 0024
Revises: 0023
Create Date: 2026-06-27
"""
from alembic import op
import sqlalchemy as sa

revision = "0024"
down_revision = "0023"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("reservations", sa.Column("owner_driver_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_reservations_owner_driver_id",
        "reservations", "vehicle_owners",
        ["owner_driver_id"], ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_reservations_owner_driver_id", "reservations", type_="foreignkey")
    op.drop_column("reservations", "owner_driver_id")
