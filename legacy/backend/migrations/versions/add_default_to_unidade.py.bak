"""Add default value 'un' to unidade column

Revision ID: add_default_unidade
Revises: merge_soft_delete_head
Create Date: 2025-12-23 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_default_unidade'
down_revision = 'merge_soft_delete_head'
branch_labels = None
depends_on = None


def upgrade():
    # Adicionar valor padrão 'un' para a coluna unidade
    with op.batch_alter_table('lista_mae_itens', schema=None) as batch_op:
        batch_op.alter_column('unidade',
                           existing_type=sa.String(length=50),
                           server_default='un',
                           existing_nullable=False)


def downgrade():
    # Remover o valor padrão
    with op.batch_alter_table('lista_mae_itens', schema=None) as batch_op:
        batch_op.alter_column('unidade',
                           existing_type=sa.String(length=50),
                           server_default=None,
                           existing_nullable=False)
