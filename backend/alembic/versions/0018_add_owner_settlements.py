"""add owner_settlements table

Revision ID: 0018
Revises: 0017
Create Date: 2026-06-26
"""
from alembic import op
import sqlalchemy as sa

revision = '0018'
down_revision = '0017'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'owner_settlements',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('settlement_number', sa.String(20), unique=True, nullable=False),
        sa.Column('reservation_id', sa.Integer(), sa.ForeignKey('reservations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('vehicle_id', sa.Integer(), sa.ForeignKey('vehicles.id', ondelete='SET NULL'), nullable=True),
        sa.Column('owner_id', sa.Integer(), sa.ForeignKey('vehicle_owners.id', ondelete='SET NULL'), nullable=True),
        sa.Column('reservation_value', sa.Numeric(12, 2), nullable=False),
        sa.Column('owner_percentage', sa.Integer(), nullable=False, server_default='70'),
        sa.Column('owner_amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('company_amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('pdf_path', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index('ix_owner_settlements_reservation_id', 'owner_settlements', ['reservation_id'])


def downgrade():
    op.drop_index('ix_owner_settlements_reservation_id', 'owner_settlements')
    op.drop_table('owner_settlements')
