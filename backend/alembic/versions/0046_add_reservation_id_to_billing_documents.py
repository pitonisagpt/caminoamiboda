"""add reservation_id to billing_documents

Revision ID: 0046
Revises: 0045
Create Date: 2026-07-20
"""
from alembic import op
import sqlalchemy as sa

revision = '0046'
down_revision = '0045'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('billing_documents', sa.Column('reservation_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_billing_documents_reservation_id',
        'billing_documents', 'reservations',
        ['reservation_id'], ['id'],
        ondelete='SET NULL',
    )


def downgrade():
    op.drop_constraint('fk_billing_documents_reservation_id', 'billing_documents', type_='foreignkey')
    op.drop_column('billing_documents', 'reservation_id')
