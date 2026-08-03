"""create ai_assistant_status and ai_assistant_usage tables

Revision ID: 0057
Revises: 0056
Create Date: 2026-08-03
"""
from alembic import op
import sqlalchemy as sa

revision = "0057"
down_revision = "0056"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "ai_assistant_status",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("disabled_reason", sa.String(30), nullable=True),
        sa.Column("disabled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("disabled_detail", sa.Text(), nullable=True),
        sa.Column("consecutive_error_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_error_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_reenable_check_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_reenable_result", sa.String(20), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "ai_assistant_usage",
        sa.Column("usage_date", sa.Date(), nullable=False),
        sa.Column("message_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("usage_date"),
    )


def downgrade():
    op.drop_table("ai_assistant_usage")
    op.drop_table("ai_assistant_status")
