"""create instagram_posts cache table

Revision ID: 0036
Revises: 0035
Create Date: 2026-06-30
"""
from alembic import op
import sqlalchemy as sa

revision = '0036'
down_revision = '0035'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'instagram_posts',
        sa.Column('instagram_id', sa.String(50), nullable=False),
        sa.Column('media_url', sa.Text(), nullable=False),
        sa.Column('thumbnail_url', sa.Text(), nullable=True),
        sa.Column('permalink', sa.Text(), nullable=False),
        sa.Column('caption', sa.Text(), nullable=True),
        sa.Column('media_type', sa.String(30), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=True),
        sa.Column('fetched_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('instagram_id'),
    )


def downgrade():
    op.drop_table('instagram_posts')
