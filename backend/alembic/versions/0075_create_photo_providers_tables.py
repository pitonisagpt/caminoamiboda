"""create photo_providers and vehicle_photo_providers tables

Revision ID: 0075
Revises: 0074
Create Date: 2026-09-09
"""
from alembic import op
import sqlalchemy as sa

revision = '0075'
down_revision = '0074'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'photo_providers',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(120), nullable=False),
        sa.Column('category', sa.String(50), nullable=True),
        sa.Column('instagram_url', sa.String(255), nullable=True),
        sa.Column('website_url', sa.String(255), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        'vehicle_photo_providers',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('photo_id', sa.Integer(), sa.ForeignKey('vehicle_photos.id', ondelete='CASCADE'), nullable=False),
        sa.Column('provider_id', sa.Integer(), sa.ForeignKey('photo_providers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_vehicle_photo_providers_photo_id', 'vehicle_photo_providers', ['photo_id'])
    op.create_index('ix_vehicle_photo_providers_provider_id', 'vehicle_photo_providers', ['provider_id'])


def downgrade():
    op.drop_table('vehicle_photo_providers')
    op.drop_table('photo_providers')
