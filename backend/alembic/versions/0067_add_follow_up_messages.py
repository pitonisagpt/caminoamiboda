"""add follow_up_messages

Revision ID: 0067
Revises: 0066
Create Date: 2026-08-24
"""
from alembic import op
import sqlalchemy as sa

revision = '0067'
down_revision = '0066'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'follow_up_messages',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('reservation_id', sa.Integer(), sa.ForeignKey('reservations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('template_key', sa.String(10), nullable=False),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint('reservation_id', 'template_key', name='uq_follow_up_reservation_template'),
    )


def downgrade():
    op.drop_table('follow_up_messages')
