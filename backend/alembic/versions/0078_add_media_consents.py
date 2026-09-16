"""add media_consents table

Revision ID: 0078
Revises: 0077
Create Date: 2026-09-15

Standalone "Autorización de Uso de Imagen, Video, Audio y Tratamiento de
Datos Personales" per reservation (wishlist fila 70) — deliberately its
own table, not part of reservation_contracts, so it's never tied to the
vehicle rental contract's validity.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0078'
down_revision = '0077'
branch_labels = None
depends_on = None

# Reuses the native 'contractstatus' enum type already created for
# vehicle_owner_contracts (0065) and reused by reservation_contracts
# (0073) — same draft/sent domain, same technique.
_contractstatus = postgresql.ENUM('draft', 'sent', name='contractstatus', create_type=False)


def upgrade():
    op.create_table(
        'media_consents',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('reservation_id', sa.Integer(), sa.ForeignKey('reservations.id', ondelete='CASCADE'), nullable=False, unique=True, index=True),
        sa.Column('consent_number', sa.String(20), nullable=False, unique=True, index=True),
        sa.Column('status', _contractstatus, nullable=False, server_default='draft'),
        sa.Column('bride_name', sa.String(255), nullable=False, server_default=''),
        sa.Column('bride_id_number', sa.String(50), nullable=True),
        sa.Column('groom_name', sa.String(255), nullable=False, server_default=''),
        sa.Column('groom_id_number', sa.String(50), nullable=True),
        sa.Column('pdf_path', sa.String(500), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table('media_consents')
    # 'contractstatus' type is intentionally NOT dropped — reservation_contracts (0073) and vehicle_owner_contracts (0065) still own/use it.
