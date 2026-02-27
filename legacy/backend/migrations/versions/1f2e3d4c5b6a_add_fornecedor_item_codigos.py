"""Add fornecedor_item_codigos table

Revision ID: 1f2e3d4c5b6a
Revises: 663a8fc57e7e
Create Date: 2026-01-12 15:10:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '1f2e3d4c5b6a'
down_revision = '663a8fc57e7e'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'fornecedor_item_codigos',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('fornecedor_id', sa.Integer(), nullable=False),
        sa.Column('item_id', sa.Integer(), nullable=False),
        sa.Column('codigo', sa.String(length=50), nullable=False),
        sa.Column('criado_em', sa.DateTime(), nullable=True),
        sa.Column('atualizado_em', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['fornecedor_id'], ['fornecedores.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['item_id'], ['itens.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('fornecedor_id', 'item_id', name='uq_fornecedor_item_codigo'),
        sa.UniqueConstraint('fornecedor_id', 'codigo', name='uq_fornecedor_codigo'),
    )
    op.create_index('ix_fornecedor_item_codigos_fornecedor', 'fornecedor_item_codigos', ['fornecedor_id'])
    op.create_index('ix_fornecedor_item_codigos_item', 'fornecedor_item_codigos', ['item_id'])


def downgrade():
    op.drop_index('ix_fornecedor_item_codigos_item', table_name='fornecedor_item_codigos')
    op.drop_index('ix_fornecedor_item_codigos_fornecedor', table_name='fornecedor_item_codigos')
    op.drop_table('fornecedor_item_codigos')
