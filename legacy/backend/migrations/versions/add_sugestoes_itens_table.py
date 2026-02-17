"""Adiciona tabela sugestoes_itens

Revision ID: abc123sugestoes
Revises: ee7f1f6e47e5
Create Date: 2024-12-27 19:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'abc123sugestoes'
down_revision = 'ee7f1f6e47e5'
branch_labels = None
depends_on = None


def upgrade():
    # Criar tabela sugestoes_itens
    op.create_table(
        'sugestoes_itens',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('usuario_id', sa.Integer(), nullable=False),
        sa.Column('lista_id', sa.Integer(), nullable=False),
        sa.Column('nome_item', sa.String(length=200), nullable=False),
        sa.Column('unidade', sa.String(length=50), nullable=False),
        sa.Column('quantidade', sa.Float(), nullable=False),
        sa.Column('mensagem_usuario', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('pendente', 'aprovada', 'rejeitada', name='sugestaostatus'), nullable=False),
        sa.Column('admin_id', sa.Integer(), nullable=True),
        sa.Column('mensagem_admin', sa.Text(), nullable=True),
        sa.Column('item_global_id', sa.Integer(), nullable=True),
        sa.Column('criado_em', sa.DateTime(), nullable=False),
        sa.Column('respondido_em', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['admin_id'], ['usuarios.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['item_global_id'], ['lista_mae_itens.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['lista_id'], ['listas.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Criar índices para melhorar performance
    op.create_index('ix_sugestoes_itens_status', 'sugestoes_itens', ['status'])
    op.create_index('ix_sugestoes_itens_usuario_id', 'sugestoes_itens', ['usuario_id'])


def downgrade():
    op.drop_index('ix_sugestoes_itens_usuario_id', table_name='sugestoes_itens')
    op.drop_index('ix_sugestoes_itens_status', table_name='sugestoes_itens')
    op.drop_table('sugestoes_itens')
    
    # Drop enum type (PostgreSQL)
    op.execute("DROP TYPE IF EXISTS sugestaostatus")
