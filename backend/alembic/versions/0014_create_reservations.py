"""create reservations table

Revision ID: 0014
Revises: 0013
Create Date: 2026-06-25
"""
from alembic import op
import sqlalchemy as sa

revision = "0014"
down_revision = "0013"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "reservations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("reservation_number", sa.String(20), unique=True, nullable=False),
        sa.Column("customer_id", sa.Integer(), sa.ForeignKey("customers.id", ondelete="SET NULL"), nullable=True),
        sa.Column("quote_id", sa.Integer(), sa.ForeignKey("quotes.id", ondelete="SET NULL"), nullable=True),
        sa.Column("event_date", sa.Date(), nullable=False),
        sa.Column("vehicle_id", sa.Integer(), sa.ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True),
        sa.Column("driver_id", sa.Integer(), sa.ForeignKey("drivers.id", ondelete="SET NULL"), nullable=True),
        sa.Column("total_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("deposit_paid", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("status", sa.String(30), nullable=False, server_default="lead"),
        sa.Column("special_instructions", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table("reservations")
