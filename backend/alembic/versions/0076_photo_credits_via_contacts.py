"""move photo credits onto Contact instead of a dedicated photo_providers table

Revision ID: 0076
Revises: 0075
Create Date: 2026-09-09
"""
from alembic import op
import sqlalchemy as sa

revision = '0076'
down_revision = '0075'
branch_labels = None
depends_on = None


def upgrade():
    # New Contact types for people who can be credited on a catalog photo.
    # Adding an enum value must run outside the values being used in the
    # same transaction, which is the case here — nothing below uses them yet.
    op.execute("ALTER TYPE contacttype ADD VALUE IF NOT EXISTS 'photographer'")
    op.execute("ALTER TYPE contacttype ADD VALUE IF NOT EXISTS 'decorator'")

    op.add_column('contacts', sa.Column('website_url', sa.String(255), nullable=True))

    # vehicle_photo_providers shipped moments ago (fila 69) with zero real
    # rows — dropping and recreating against contacts.id instead of the
    # now-removed photo_providers.id is simpler and safer than an in-place
    # column rename + constraint swap for a table with nothing to preserve.
    op.drop_table('vehicle_photo_providers')
    op.create_table(
        'vehicle_photo_providers',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('photo_id', sa.Integer(), sa.ForeignKey('vehicle_photos.id', ondelete='CASCADE'), nullable=False),
        sa.Column('contact_id', sa.Integer(), sa.ForeignKey('contacts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_vehicle_photo_providers_photo_id', 'vehicle_photo_providers', ['photo_id'])
    op.create_index('ix_vehicle_photo_providers_contact_id', 'vehicle_photo_providers', ['contact_id'])

    op.drop_table('photo_providers')


def downgrade():
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

    op.drop_table('vehicle_photo_providers')
    op.create_table(
        'vehicle_photo_providers',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('photo_id', sa.Integer(), sa.ForeignKey('vehicle_photos.id', ondelete='CASCADE'), nullable=False),
        sa.Column('provider_id', sa.Integer(), sa.ForeignKey('photo_providers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_vehicle_photo_providers_photo_id', 'vehicle_photo_providers', ['photo_id'])
    op.create_index('ix_vehicle_photo_providers_provider_id', 'vehicle_photo_providers', ['provider_id'])

    op.drop_column('contacts', 'website_url')

    # Postgres has no DROP VALUE for enums — the 'photographer'/'decorator'
    # values are left in place on downgrade (harmless if unused).