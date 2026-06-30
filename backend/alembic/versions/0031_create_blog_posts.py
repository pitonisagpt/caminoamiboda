"""create blog_posts table

Revision ID: 0031
Revises: 0030
Create Date: 2026-06-30
"""
from alembic import op
import sqlalchemy as sa

revision = '0031'
down_revision = '0030'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'blog_posts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(300), nullable=False),
        sa.Column('slug', sa.String(300), nullable=False, unique=True),
        sa.Column('excerpt', sa.Text(), nullable=True),
        sa.Column('content_md', sa.Text(), nullable=True),
        sa.Column('cover_image_url', sa.String(500), nullable=True),
        sa.Column('published', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_blog_posts_slug', 'blog_posts', ['slug'], unique=True)
    op.create_index('ix_blog_posts_published', 'blog_posts', ['published', 'published_at'])


def downgrade():
    op.drop_index('ix_blog_posts_published', table_name='blog_posts')
    op.drop_index('ix_blog_posts_slug', table_name='blog_posts')
    op.drop_table('blog_posts')
