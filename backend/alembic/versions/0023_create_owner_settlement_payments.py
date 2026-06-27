"""create owner_settlement_payments

Revision ID: 0023
Revises: 0022
Create Date: 2026-06-26
"""
from alembic import op
import sqlalchemy as sa

revision = "0023"
down_revision = "0022"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "owner_settlement_payments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "settlement_id",
            sa.Integer(),
            sa.ForeignKey("owner_settlements.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("paid_at", sa.Date(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("owner_settlement_payments")
