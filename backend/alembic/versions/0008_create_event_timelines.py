"""create event_timelines table

Revision ID: 0008
Revises: 0007
Create Date: 2026-06-24
"""
from alembic import op
import sqlalchemy as sa

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "event_timelines",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("event_name", sa.String(255), nullable=False),
        sa.Column("event_type", sa.Enum("wedding", "brand_activation", "audiovisual_production", "quinceanera", "other", name="eventtype"), nullable=False, server_default="wedding"),
        sa.Column("event_date", sa.Date(), nullable=False),
        sa.Column("main_contact_name", sa.String(255), nullable=True),
        sa.Column("main_contact_phone", sa.String(50), nullable=True),
        sa.Column("assigned_vehicle", sa.String(255), nullable=True),
        sa.Column("assigned_driver", sa.String(255), nullable=True),
        sa.Column("special_instructions", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("share_token_driver", sa.String(64), unique=True, nullable=False),
        sa.Column("share_token_customer", sa.String(64), unique=True, nullable=False),
        sa.Column("share_token_ops", sa.String(64), unique=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("event_timelines")
    op.execute("DROP TYPE IF EXISTS eventtype")
