"""add whatsapp_username to customers, contacts, drivers, vehicle_owners

Revision ID: 0059
Revises: 0058
Create Date: 2026-08-13
"""
from alembic import op
import sqlalchemy as sa

revision = "0059"
down_revision = "0058"
branch_labels = None
depends_on = None

TABLES = ["customers", "contacts", "drivers", "vehicle_owners"]


def upgrade():
    for table in TABLES:
        op.add_column(table, sa.Column("whatsapp_username", sa.String(length=50), nullable=True))


def downgrade():
    for table in TABLES:
        op.drop_column(table, "whatsapp_username")
