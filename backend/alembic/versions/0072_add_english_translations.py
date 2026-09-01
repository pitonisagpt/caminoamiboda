"""add english translation columns for public i18n

Revision ID: 0072
Revises: 0071
Create Date: 2026-08-31
"""
from alembic import op
import sqlalchemy as sa

revision = '0072'
down_revision = '0071'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('vehicles', sa.Column('bride_description_en', sa.Text(), nullable=True))
    op.add_column('reviews', sa.Column('body_en', sa.Text(), nullable=True))
    op.add_column('florist_settings', sa.Column('description_en', sa.Text(), nullable=True))
    op.add_column('blog_posts', sa.Column('title_en', sa.String(300), nullable=True))
    op.add_column('blog_posts', sa.Column('slug_en', sa.String(300), nullable=True))
    op.add_column('blog_posts', sa.Column('excerpt_en', sa.Text(), nullable=True))
    op.add_column('blog_posts', sa.Column('content_md_en', sa.Text(), nullable=True))
    op.create_index('ix_blog_posts_slug_en', 'blog_posts', ['slug_en'], unique=True)


def downgrade():
    op.drop_index('ix_blog_posts_slug_en', table_name='blog_posts')
    op.drop_column('blog_posts', 'content_md_en')
    op.drop_column('blog_posts', 'excerpt_en')
    op.drop_column('blog_posts', 'slug_en')
    op.drop_column('blog_posts', 'title_en')
    op.drop_column('florist_settings', 'description_en')
    op.drop_column('reviews', 'body_en')
    op.drop_column('vehicles', 'bride_description_en')
