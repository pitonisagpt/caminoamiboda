"""create quotes table

Revision ID: 0012
Revises: 0011
Create Date: 2026-06-25
"""
from alembic import op
import sqlalchemy as sa

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "quotes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("quote_number", sa.String(20), nullable=False, unique=True),
        # Customer — FK optional; free-text fallback
        sa.Column("customer_id", sa.Integer(), sa.ForeignKey("customers.id", ondelete="SET NULL"), nullable=True),
        sa.Column("customer_name", sa.String(200), nullable=True),
        sa.Column("customer_phone", sa.String(50), nullable=True),
        # Vehicle — FK optional; free-text fallback
        sa.Column("vehicle_id", sa.Integer(), sa.ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True),
        sa.Column("vehicle_description", sa.String(300), nullable=True),
        # Event
        sa.Column("event_date", sa.Date(), nullable=False),
        sa.Column("service_duration", sa.String(100), nullable=True),
        sa.Column("location_zone", sa.String(30), nullable=False, server_default="medellin"),
        # Locations
        sa.Column("pickup_location", sa.Text(), nullable=True),
        sa.Column("ceremony_location", sa.Text(), nullable=True),
        sa.Column("reception_location", sa.Text(), nullable=True),
        # Financials
        sa.Column("total_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("deposit_amount", sa.Numeric(12, 2), nullable=True),
        sa.Column("payment_instructions", sa.Text(), nullable=True),
        # Meta
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("pdf_path", sa.String(500), nullable=True),
        sa.Column("share_token", sa.String(64), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index("ix_quotes_status", "quotes", ["status"])
    op.create_index("ix_quotes_event_date", "quotes", ["event_date"])


def downgrade() -> None:
    op.drop_table("quotes")
