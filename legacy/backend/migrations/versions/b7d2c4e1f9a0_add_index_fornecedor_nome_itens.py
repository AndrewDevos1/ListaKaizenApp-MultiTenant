"""Add index on itens (fornecedor_id, nome)

Revision ID: b7d2c4e1f9a0
Revises: 0ab1fb555534
Create Date: 2026-01-12 14:08:00.000000

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = 'b7d2c4e1f9a0'
down_revision = '0ab1fb555534'
branch_labels = None
depends_on = None


def upgrade():
    op.create_index('idx_fornecedor_nome', 'itens', ['fornecedor_id', 'nome'])


def downgrade():
    op.drop_index('idx_fornecedor_nome', table_name='itens')
