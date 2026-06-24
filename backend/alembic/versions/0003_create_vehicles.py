"""create vehicles table

Revision ID: 0003
Revises: 0002
Create Date: 2025-01-01 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "vehicles",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("license_plate", sa.String(20), nullable=False, unique=True, index=True),
        sa.Column("brand", sa.String(100), nullable=False),
        sa.Column("model_line", sa.String(150), nullable=True),
        sa.Column("color", sa.String(100), nullable=True),
        sa.Column("year", sa.Integer(), nullable=True),
        sa.Column(
            "vehicle_type",
            sa.Enum("car", "motorcycle", name="vehicletype"),
            nullable=False,
            server_default="car",
        ),
        sa.Column("body_type", sa.String(50), nullable=True),
        sa.Column("capacity", sa.SmallInteger(), nullable=True),
        sa.Column(
            "location",
            sa.Enum("medellin", "rionegro", "carmen_de_viboral", name="vehiclelocation"),
            nullable=False,
            server_default="medellin",
        ),
        sa.Column(
            "status",
            sa.Enum("active", "inactive", "pending", name="vehiclestatus"),
            nullable=False,
            server_default="active",
        ),
        sa.Column("owner_name", sa.String(255), nullable=True),
        sa.Column("owner_contact", sa.String(100), nullable=True),
        sa.Column("price_medellin", sa.Numeric(12, 2), nullable=True),
        sa.Column("price_rionegro", sa.Numeric(12, 2), nullable=True),
        sa.Column("score_elegance", sa.SmallInteger(), nullable=True),
        sa.Column("score_exclusivity", sa.SmallInteger(), nullable=True),
        sa.Column("score_photogeny", sa.SmallInteger(), nullable=True),
        sa.Column("score_comfort", sa.SmallInteger(), nullable=True),
        sa.Column("score_romance", sa.SmallInteger(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("photo_urls", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("vehicles")
    op.execute("DROP TYPE IF EXISTS vehicletype")
    op.execute("DROP TYPE IF EXISTS vehiclelocation")
    op.execute("DROP TYPE IF EXISTS vehiclestatus")
