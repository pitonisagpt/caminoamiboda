"""Add contact_id to reservations

Revision ID: 0021
Revises: 0020
Create Date: 2026-06-26
"""

from alembic import op
import sqlalchemy as sa

revision = "0021"
down_revision = "0020"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "reservations",
        sa.Column("contact_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_reservations_contact_id",
        "reservations",
        "contacts",
        ["contact_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade():
    op.drop_constraint("fk_reservations_contact_id", "reservations", type_="foreignkey")
    op.drop_column("reservations", "contact_id")
