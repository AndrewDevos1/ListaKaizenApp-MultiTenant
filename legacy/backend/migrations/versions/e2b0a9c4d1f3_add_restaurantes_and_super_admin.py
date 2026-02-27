"""Add restaurantes table and SUPER_ADMIN role.

Revision ID: e2b0a9c4d1f3
Revises: f2f0961bd9e4
Create Date: 2025-12-30 04:40:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e2b0a9c4d1f3'
down_revision = 'f2f0961bd9e4'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        try:
            op.execute("ALTER TYPE userroles ADD VALUE IF NOT EXISTS 'SUPER_ADMIN'")
        except Exception:
            pass

    op.create_table(
        'restaurantes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nome', sa.String(length=200), nullable=False),
        sa.Column('slug', sa.String(length=100), nullable=False),
        sa.Column('ativo', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('criado_em', sa.DateTime(), nullable=False),
        sa.Column('atualizado_em', sa.DateTime(), nullable=True),
        sa.Column('deletado', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('nome'),
        sa.UniqueConstraint('slug')
    )
    op.create_index('ix_restaurantes_slug', 'restaurantes', ['slug'], unique=False)


def downgrade():
    op.drop_index('ix_restaurantes_slug', table_name='restaurantes')
    op.drop_table('restaurantes')
    # Downgrade de enum em PostgreSQL não é trivial; valor SUPER_ADMIN permanece.
