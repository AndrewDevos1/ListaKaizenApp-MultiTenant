"""Add restaurante_id to usuarios.

Revision ID: f0c1d2e3b4a5
Revises: e2b0a9c4d1f3
Create Date: 2025-12-30 04:41:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = 'f0c1d2e3b4a5'
down_revision = 'e2b0a9c4d1f3'
branch_labels = None
depends_on = None


def _column_exists(table_name, column_name):
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def _index_exists(table_name, index_name):
    bind = op.get_bind()
    inspector = inspect(bind)
    indexes = [idx['name'] for idx in inspector.get_indexes(table_name)]
    return index_name in indexes


def upgrade():
    with op.batch_alter_table('usuarios', schema=None) as batch_op:
        if not _column_exists('usuarios', 'restaurante_id'):
            batch_op.add_column(sa.Column('restaurante_id', sa.Integer(), nullable=True))
            batch_op.create_foreign_key(
                'fk_usuarios_restaurante',
                'restaurantes',
                ['restaurante_id'],
                ['id']
            )
        if not _index_exists('usuarios', 'ix_usuarios_restaurante_id'):
            batch_op.create_index('ix_usuarios_restaurante_id', ['restaurante_id'])


def downgrade():
    with op.batch_alter_table('usuarios', schema=None) as batch_op:
        if _index_exists('usuarios', 'ix_usuarios_restaurante_id'):
            batch_op.drop_index('ix_usuarios_restaurante_id')
        if _column_exists('usuarios', 'restaurante_id'):
            batch_op.drop_constraint('fk_usuarios_restaurante', type_='foreignkey')
            batch_op.drop_column('restaurante_id')
