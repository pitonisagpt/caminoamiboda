"""add vehicle_owner_contracts and vehicle_owner_attachments

Revision ID: 0065
Revises: 0064
Create Date: 2026-08-22
"""
from alembic import op
import sqlalchemy as sa

revision = '0065'
down_revision = '0064'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'vehicle_owner_contracts',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('owner_id', sa.Integer(), sa.ForeignKey('vehicle_owners.id', ondelete='CASCADE'), nullable=False, unique=True, index=True),
        sa.Column('contract_number', sa.String(20), nullable=False, unique=True, index=True),
        sa.Column('status', sa.Enum('draft', 'sent', name='contractstatus'), nullable=False, server_default='draft'),
        sa.Column('pdf_path', sa.String(500), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        'vehicle_owner_attachments',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('owner_id', sa.Integer(), sa.ForeignKey('vehicle_owners.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('file_name', sa.String(255), nullable=False, unique=True),
        sa.Column('original_name', sa.String(255), nullable=False),
        sa.Column('content_type', sa.String(100), nullable=False),
        sa.Column('size_bytes', sa.Integer(), nullable=False),
        sa.Column('category', sa.String(30), nullable=False, server_default='other'),
        sa.Column('uploaded_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table('vehicle_owner_attachments')
    op.drop_table('vehicle_owner_contracts')
    op.execute('DROP TYPE IF EXISTS contractstatus')
