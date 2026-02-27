"""add session token to usuario

Revision ID: c1a2b3c4d5e6
Revises: a3c4d5e6f7b8
Create Date: 2025-01-05 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c1a2b3c4d5e6'
down_revision = 'a3c4d5e6f7b8'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('usuarios', sa.Column('session_token', sa.String(length=64), nullable=True))
    op.add_column('usuarios', sa.Column('session_updated_at', sa.DateTime(), nullable=True))
    op.create_index('ix_usuarios_session_token', 'usuarios', ['session_token'])


def downgrade():
    op.drop_index('ix_usuarios_session_token', table_name='usuarios')
    op.drop_column('usuarios', 'session_updated_at')
    op.drop_column('usuarios', 'session_token')
