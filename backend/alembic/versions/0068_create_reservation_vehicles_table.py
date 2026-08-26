"""create reservation_vehicles table (+ backfill from reservations)

Revision ID: 0068
Revises: 0067
Create Date: 2026-08-26
"""
from alembic import op
import sqlalchemy as sa

revision = '0068'
down_revision = '0067'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'reservation_vehicles',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('reservation_id', sa.Integer(), sa.ForeignKey('reservations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('vehicle_id', sa.Integer(), sa.ForeignKey('vehicles.id', ondelete='SET NULL'), nullable=True),
        sa.Column('driver_id', sa.Integer(), sa.ForeignKey('drivers.id', ondelete='SET NULL'), nullable=True),
        sa.Column('owner_driver_id', sa.Integer(), sa.ForeignKey('vehicle_owners.id', ondelete='SET NULL'), nullable=True),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint('reservation_id', 'vehicle_id', name='uq_reservation_vehicle'),
    )
    op.create_index('ix_reservation_vehicles_reservation_id', 'reservation_vehicles', ['reservation_id'])
    op.create_index('ix_reservation_vehicles_vehicle_id', 'reservation_vehicles', ['vehicle_id'])
    op.create_index('ix_reservation_vehicles_driver_id', 'reservation_vehicles', ['driver_id'])
    op.create_index('ix_reservation_vehicles_owner_driver_id', 'reservation_vehicles', ['owner_driver_id'])

    # Backfill: every existing reservation's single vehicle/driver/owner_driver
    # becomes its one (and, for now, only) row here — the "primary" vehicle.
    op.execute("""
        INSERT INTO reservation_vehicles (reservation_id, vehicle_id, driver_id, owner_driver_id, display_order, created_at)
        SELECT id, vehicle_id, driver_id, owner_driver_id, 0, now()
        FROM reservations
        WHERE vehicle_id IS NOT NULL
    """)


def downgrade():
    op.drop_table('reservation_vehicles')
