"""create billing documents table

Revision ID: 0001
Revises:
Create Date: 2025-01-01 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "billing_documents",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("document_number", sa.String(length=20), nullable=False),
        sa.Column(
            "document_type",
            sa.Enum("formal", "letter", name="documenttype"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum("draft", "sent", "paid", name="documentstatus"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("client_name", sa.String(length=255), nullable=False),
        sa.Column(
            "client_id_type",
            sa.Enum("CC", "NIT", name="idtype"),
            nullable=False,
        ),
        sa.Column("client_id_number", sa.String(length=50), nullable=False),
        sa.Column("client_address", sa.String(length=500), nullable=True),
        sa.Column("client_email", sa.String(length=255), nullable=True),
        sa.Column("client_phone", sa.String(length=50), nullable=True),
        sa.Column("service_date", sa.Date(), nullable=False),
        sa.Column("concept", sa.Text(), nullable=False),
        sa.Column("vehicle_description", sa.String(length=500), nullable=True),
        sa.Column("time_start", sa.String(length=10), nullable=True),
        sa.Column("time_end", sa.String(length=10), nullable=True),
        sa.Column("route", sa.Text(), nullable=True),
        sa.Column("special_conditions", sa.Text(), nullable=True),
        sa.Column("total_amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("payment_instructions", sa.Text(), nullable=False),
        sa.Column("include_cancellation_policy", sa.Boolean(), nullable=False),
        sa.Column("include_breakdown_policy", sa.Boolean(), nullable=False),
        sa.Column("pdf_path", sa.String(length=500), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_billing_documents_id", "billing_documents", ["id"])
    op.create_index(
        "ix_billing_documents_document_number",
        "billing_documents",
        ["document_number"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_billing_documents_document_number", table_name="billing_documents")
    op.drop_index("ix_billing_documents_id", table_name="billing_documents")
    op.drop_table("billing_documents")
    op.execute("DROP TYPE IF EXISTS documenttype")
    op.execute("DROP TYPE IF EXISTS documentstatus")
    op.execute("DROP TYPE IF EXISTS idtype")
