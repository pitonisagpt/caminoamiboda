"""create catalog_locations table

Revision ID: 0029
Revises: 0028
Create Date: 2026-06-30
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0029'
down_revision = '0028'
branch_labels = None
depends_on = None

_locationtype = postgresql.ENUM(
    'pickup', 'ceremony', 'reception', 'photoshoot', 'other',
    name='locationtype',
    create_type=False,
)


def upgrade():
    op.create_table(
        'catalog_locations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('location_type', _locationtype, nullable=False, server_default='other'),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('google_maps_link', sa.String(500), nullable=True),
        sa.Column('contact_person', sa.String(255), nullable=True),
        sa.Column('contact_phone', sa.String(50), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_catalog_locations_id', 'catalog_locations', ['id'])


def downgrade():
    op.drop_index('ix_catalog_locations_id', table_name='catalog_locations')
    op.drop_table('catalog_locations')
