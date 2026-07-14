"""create reservation_attachments

Revision ID: 0041
Revises: 0040
Create Date: 2026-07-15
"""
from alembic import op
import sqlalchemy as sa

revision = '0041'
down_revision = '0040'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'reservation_attachments',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('reservation_id', sa.Integer(), sa.ForeignKey('reservations.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('file_name', sa.String(255), nullable=False, unique=True),
        sa.Column('original_name', sa.String(255), nullable=False),
        sa.Column('content_type', sa.String(100), nullable=False),
        sa.Column('size_bytes', sa.Integer(), nullable=False),
        sa.Column('category', sa.String(30), nullable=False, server_default='other'),
        sa.Column('uploaded_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table('reservation_attachments')
