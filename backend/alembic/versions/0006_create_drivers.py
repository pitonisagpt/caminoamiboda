"""create drivers table

Revision ID: 0006
Revises: 0005
Create Date: 2026-06-24
"""
from alembic import op
import sqlalchemy as sa

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "drivers",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("identification_number", sa.String(50), nullable=True),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("whatsapp", sa.String(50), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("driver_license_number", sa.String(50), nullable=True),
        sa.Column("license_expiration_date", sa.Date(), nullable=True),
        sa.Column("authorized_vehicles", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", sa.Enum("active", "inactive", name="driverstatus"), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("drivers")
    op.execute("DROP TYPE IF EXISTS driverstatus")
