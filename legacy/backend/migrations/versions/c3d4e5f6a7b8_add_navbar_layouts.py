"""Add navbar_layouts table

Revision ID: c3d4e5f6a7b8
Revises: b8c9d0e1f2a3
Create Date: 2026-01-15 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c3d4e5f6a7b8'
down_revision = 'b8c9d0e1f2a3'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'navbar_layouts',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('layout', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('criado_em', sa.DateTime(), nullable=True),
        sa.Column('atualizado_em', sa.DateTime(), nullable=True)
    )


def downgrade():
    op.drop_table('navbar_layouts')
