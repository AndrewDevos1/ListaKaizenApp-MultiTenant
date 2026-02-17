"""Add listas rapidas tables

Revision ID: 79b5e3993890
Revises: 5937888965db
Create Date: 2025-12-27 23:38:10.503650

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '79b5e3993890'
down_revision = '5937888965db'
branch_labels = None
depends_on = None


def upgrade():
    # Criar tabela listas_rapidas (enums serão criados automaticamente pelo SQLAlchemy)
    op.create_table(
        'listas_rapidas',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('usuario_id', sa.Integer(), nullable=False),
        sa.Column('nome', sa.String(length=200), nullable=False),
        sa.Column('descricao', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('rascunho', 'pendente', 'aprovada', 'rejeitada', name='statuslistarapida', create_type=False), nullable=False),
        sa.Column('admin_id', sa.Integer(), nullable=True),
        sa.Column('mensagem_admin', sa.Text(), nullable=True),
        sa.Column('criado_em', sa.DateTime(), nullable=False),
        sa.Column('submetido_em', sa.DateTime(), nullable=True),
        sa.Column('respondido_em', sa.DateTime(), nullable=True),
        sa.Column('deletado', sa.Boolean(), nullable=False, server_default='false'),
        sa.ForeignKeyConstraint(['admin_id'], ['usuarios.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_index('ix_listas_rapidas_usuario_id', 'listas_rapidas', ['usuario_id'])
    op.create_index('ix_listas_rapidas_status', 'listas_rapidas', ['status'])
    
    # Criar tabela listas_rapidas_itens
    op.create_table(
        'listas_rapidas_itens',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('lista_rapida_id', sa.Integer(), nullable=False),
        sa.Column('item_global_id', sa.Integer(), nullable=False),
        sa.Column('prioridade', sa.Enum('prevencao', 'precisa_comprar', 'urgente', name='prioridadeitem', create_type=False), nullable=False),
        sa.Column('observacao', sa.Text(), nullable=True),
        sa.Column('criado_em', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['item_global_id'], ['lista_mae_itens.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['lista_rapida_id'], ['listas_rapidas.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_index('ix_listas_rapidas_itens_lista_id', 'listas_rapidas_itens', ['lista_rapida_id'])
    op.create_index('ix_listas_rapidas_itens_prioridade', 'listas_rapidas_itens', ['prioridade'])


def downgrade():
    op.drop_index('ix_listas_rapidas_itens_prioridade', table_name='listas_rapidas_itens')
    op.drop_index('ix_listas_rapidas_itens_lista_id', table_name='listas_rapidas_itens')
    op.drop_table('listas_rapidas_itens')
    
    op.drop_index('ix_listas_rapidas_status', table_name='listas_rapidas')
    op.drop_index('ix_listas_rapidas_usuario_id', table_name='listas_rapidas')
    op.drop_table('listas_rapidas')
    
    op.execute('DROP TYPE statuslistarapida')
    op.execute('DROP TYPE prioridadeitem')
