"""add include_no_retencion_declaration to billing_documents

Revision ID: 0058
Revises: 0057
Create Date: 2026-08-04
"""
from alembic import op
import sqlalchemy as sa

revision = "0058"
down_revision = "0057"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "billing_documents",
        sa.Column("include_no_retencion_declaration", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade():
    op.drop_column("billing_documents", "include_no_retencion_declaration")
