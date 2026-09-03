"""add reservation contracts, payment schedule items, vehicle SOAT and reservation decoration fields

Revision ID: 0073
Revises: 0072
Create Date: 2026-09-02
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0073'
down_revision = '0072'
branch_labels = None
depends_on = None

# Reuses the native 'contractstatus' enum type already created for
# vehicle_owner_contracts (see 0065) — same draft/sent domain for a sibling
# contract type. Same technique 0029 used to reuse 0009's 'locationtype'.
_contractstatus = postgresql.ENUM('draft', 'sent', name='contractstatus', create_type=False)


def upgrade():
    op.add_column('vehicles', sa.Column('soat_expiration', sa.Date(), nullable=True))

    op.add_column('reservations', sa.Column('decoration_details', sa.Text(), nullable=True))
    op.add_column('reservations', sa.Column('decoration_removal_date', sa.Date(), nullable=True))

    op.create_table(
        'reservation_payment_schedule_items',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('reservation_id', sa.Integer(), sa.ForeignKey('reservations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('percentage', sa.Numeric(5, 2), nullable=True),
        sa.Column('fixed_amount', sa.Numeric(12, 2), nullable=True),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_reservation_payment_schedule_items_reservation_id', 'reservation_payment_schedule_items', ['reservation_id'])

    op.create_table(
        'reservation_contracts',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('reservation_id', sa.Integer(), sa.ForeignKey('reservations.id', ondelete='CASCADE'), nullable=False, unique=True, index=True),
        sa.Column('contract_number', sa.String(20), nullable=False, unique=True, index=True),
        sa.Column('status', _contractstatus, nullable=False, server_default='draft'),
        sa.Column('client_type', sa.String(20), nullable=False, server_default='individual'),
        sa.Column('client_name', sa.String(255), nullable=False, server_default=''),
        sa.Column('client_legal_rep_name', sa.String(255), nullable=True),
        sa.Column('client_legal_rep_id_number', sa.String(50), nullable=True),
        sa.Column('client_id_type', sa.String(10), nullable=False, server_default='CC'),
        sa.Column('client_id_number', sa.String(50), nullable=False, server_default=''),
        sa.Column('authorized_use', sa.Text(), nullable=True),
        sa.Column('special_conditions', sa.Text(), nullable=True),
        sa.Column('pdf_path', sa.String(500), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table('reservation_contracts')
    op.drop_index('ix_reservation_payment_schedule_items_reservation_id', table_name='reservation_payment_schedule_items')
    op.drop_table('reservation_payment_schedule_items')
    op.drop_column('reservations', 'decoration_removal_date')
    op.drop_column('reservations', 'decoration_details')
    op.drop_column('vehicles', 'soat_expiration')
    # 'contractstatus' type is intentionally NOT dropped — vehicle_owner_contracts (0065) still owns/uses it.
