"""add service_orders

Revision ID: 0066
Revises: 0065
Create Date: 2026-08-24
"""
from alembic import op
import sqlalchemy as sa

revision = '0066'
down_revision = '0065'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'service_orders',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('order_number', sa.String(20), nullable=False, unique=True),
        sa.Column('reservation_id', sa.Integer(), sa.ForeignKey('reservations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('vehicle_id', sa.Integer(), sa.ForeignKey('vehicles.id', ondelete='SET NULL'), nullable=True),
        sa.Column('owner_id', sa.Integer(), sa.ForeignKey('vehicle_owners.id', ondelete='SET NULL'), nullable=True),
        sa.Column('owner_percentage', sa.Integer(), nullable=False, server_default='70'),
        sa.Column('status', sa.String(20), nullable=False, server_default='draft'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('pdf_path', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table('service_orders')
