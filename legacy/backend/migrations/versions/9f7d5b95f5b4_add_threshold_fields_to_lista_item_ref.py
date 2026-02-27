"""add threshold fields to lista_item_ref

Revision ID: 9f7d5b95f5b4
Revises: c2f1a8b4d7e9
Create Date: 2026-01-31 01:53:15.565336

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9f7d5b95f5b4'
down_revision = 'c2f1a8b4d7e9'
branch_labels = None
depends_on = None


def upgrade():
    # Adicionar campos de threshold/fardo na tabela lista_item_ref
    with op.batch_alter_table('lista_item_ref', schema=None) as batch_op:
        batch_op.add_column(sa.Column('usa_threshold', sa.Boolean(), nullable=False, server_default='false'))
        batch_op.add_column(sa.Column('quantidade_por_fardo', sa.Float(), nullable=False, server_default='1.0'))


def downgrade():
    with op.batch_alter_table('lista_item_ref', schema=None) as batch_op:
        batch_op.drop_column('quantidade_por_fardo')
        batch_op.drop_column('usa_threshold')
