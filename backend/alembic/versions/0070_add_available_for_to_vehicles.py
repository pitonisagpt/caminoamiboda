"""add available_for to vehicles

Revision ID: 0070
Revises: 0069
Create Date: 2026-08-27
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0070'
down_revision = '0069'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'vehicles',
        sa.Column('available_for', postgresql.JSONB(), nullable=True),
    )
    # Every vehicle offered today serves weddings, audiovisual productions,
    # and brand activations. Tourism/retro-travel isn't offered yet, so no
    # existing vehicle gets it automatically.
    op.execute("""
        UPDATE vehicles
        SET available_for = '["wedding", "audiovisual_production", "brand_activation"]'::jsonb
        WHERE available_for IS NULL
    """)


def downgrade():
    op.drop_column('vehicles', 'available_for')
