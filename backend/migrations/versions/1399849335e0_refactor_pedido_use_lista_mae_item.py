"""refactor_pedido_use_lista_mae_item

Revision ID: 1399849335e0
Revises: 0ab1fb555534
Create Date: 2025-12-26 01:12:04.304920

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '1399849335e0'
down_revision = '0ab1fb555534'
branch_labels = None
depends_on = None


def upgrade():
    """
    Refatora modelo Pedido para usar ListaMaeItem em vez de Item.
    """
    # PASSO 1: Tornar fornecedor_id nullable
    with op.batch_alter_table('pedidos', schema=None) as batch_op:
        batch_op.alter_column('fornecedor_id',
                              existing_type=sa.Integer(),
                              nullable=True)
    
    # PASSO 2: Adicionar nova coluna lista_mae_item_id
    with op.batch_alter_table('pedidos', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('lista_mae_item_id', sa.Integer(), nullable=True)
        )
    
    # PASSO 3: Criar FK para lista_mae_itens
    with op.batch_alter_table('pedidos', schema=None) as batch_op:
        batch_op.create_foreign_key(
            'fk_pedido_lista_mae_item',
            'lista_mae_itens',
            ['lista_mae_item_id'],
            ['id'],
            ondelete='CASCADE'
        )
    
    # PASSO 4: Migrar dados existentes (se houver)
    # Como tabela 'itens' está vazia e 'pedidos' está vazia, não há dados para migrar
    
    # PASSO 5: Tornar lista_mae_item_id NOT NULL (após migração)
    # Como não há dados, podemos fazer direto
    with op.batch_alter_table('pedidos', schema=None) as batch_op:
        batch_op.alter_column('lista_mae_item_id',
                              existing_type=sa.Integer(),
                              nullable=False)
    
    # PASSO 6: Remover coluna item_id antiga
    with op.batch_alter_table('pedidos', schema=None) as batch_op:
        batch_op.drop_constraint('pedidos_item_id_fkey', type_='foreignkey')
        batch_op.drop_column('item_id')


def downgrade():
    """
    Reverte as mudanças (volta para modelo antigo).
    """
    # Recriar coluna item_id
    with op.batch_alter_table('pedidos', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('item_id', sa.Integer(), nullable=True)
        )
        batch_op.create_foreign_key(
            'pedidos_item_id_fkey',
            'itens',
            ['item_id'],
            ['id']
        )
    
    # Remover lista_mae_item_id
    with op.batch_alter_table('pedidos', schema=None) as batch_op:
        batch_op.drop_constraint('fk_pedido_lista_mae_item', type_='foreignkey')
        batch_op.drop_column('lista_mae_item_id')
    
    # Tornar fornecedor_id NOT NULL novamente
    with op.batch_alter_table('pedidos', schema=None) as batch_op:
        batch_op.alter_column('fornecedor_id',
                              existing_type=sa.Integer(),
                              nullable=False)
