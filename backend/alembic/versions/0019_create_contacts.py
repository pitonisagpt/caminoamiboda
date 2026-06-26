"""create contacts table

Revision ID: 0019
Revises: 0018
Create Date: 2026-06-26
"""
from alembic import op
import sqlalchemy as sa

revision = '0019'
down_revision = '0018'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'contacts',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('contact_type', sa.Enum('planner', 'venue', 'agency', 'other', name='contacttype'), nullable=False, server_default='planner'),
        sa.Column('location', sa.String(255), nullable=True),
        sa.Column('phone', sa.String(50), nullable=True),
        sa.Column('instagram', sa.String(100), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('status', sa.Enum('prospect', 'active', 'inactive', name='contactstatus'), nullable=False, server_default='prospect'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('last_contacted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_contacts_full_name', 'contacts', ['full_name'])


def downgrade():
    op.drop_index('ix_contacts_full_name', 'contacts')
    op.drop_table('contacts')
    op.execute("DROP TYPE IF EXISTS contacttype")
    op.execute("DROP TYPE IF EXISTS contactstatus")
