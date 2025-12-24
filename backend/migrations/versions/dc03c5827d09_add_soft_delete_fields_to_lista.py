"""Add soft delete fields to Lista

Revision ID: dc03c5827d09
Revises: b08241e9b6cb
Create Date: 2025-12-23 23:14:16.498554

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'dc03c5827d09'
down_revision = 'b08241e9b6cb'
branch_labels = None
depends_on = None


def upgrade():
    # Adicionar campos de soft delete à tabela listas
    with op.batch_alter_table('listas', schema=None) as batch_op:
        batch_op.add_column(sa.Column('deletado', sa.Boolean(), nullable=False, server_default='false'))
        batch_op.add_column(sa.Column('data_delecao', sa.DateTime(), nullable=True))


def downgrade():
    # Remover campos de soft delete
    with op.batch_alter_table('listas', schema=None) as batch_op:
        batch_op.drop_column('data_delecao')
        batch_op.drop_column('deletado')
