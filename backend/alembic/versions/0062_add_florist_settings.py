"""add florist_settings and florist_photos

Revision ID: 0062
Revises: 0061
Create Date: 2026-08-19
"""
from alembic import op
import sqlalchemy as sa

revision = '0062'
down_revision = '0061'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'florist_settings',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('vendor_name', sa.String(120), nullable=False, server_default='Lluvia de Rosas'),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('whatsapp_number', sa.String(20), nullable=False),
        sa.Column('whatsapp_message', sa.Text(), nullable=False),
        sa.Column('instagram_url', sa.String(255), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        'florist_photos',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('file_name', sa.String(255), nullable=False, unique=True),
        sa.Column('original_name', sa.String(255), nullable=False),
        sa.Column('label', sa.String(120), nullable=False, server_default=''),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_visible', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table('florist_photos')
    op.drop_table('florist_settings')
