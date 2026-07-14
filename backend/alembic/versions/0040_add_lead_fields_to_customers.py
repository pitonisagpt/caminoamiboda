"""add lead_status, lead_temperature, aplica_hora_regalo to customers

Revision ID: 0040
Revises: 0039
Create Date: 2026-07-14
"""
from alembic import op
import sqlalchemy as sa

revision = '0040'
down_revision = '0039'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('customers', sa.Column('lead_status', sa.String(20), nullable=False, server_default='activo'))
    op.add_column('customers', sa.Column('lead_temperature', sa.String(20), nullable=True))
    op.add_column('customers', sa.Column('aplica_hora_regalo', sa.Boolean(), nullable=False, server_default='false'))


def downgrade():
    op.drop_column('customers', 'aplica_hora_regalo')
    op.drop_column('customers', 'lead_temperature')
    op.drop_column('customers', 'lead_status')
