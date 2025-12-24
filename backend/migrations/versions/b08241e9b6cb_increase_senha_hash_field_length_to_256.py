"""Increase senha_hash field length to 256

Revision ID: b08241e9b6cb
Revises: 74dbf5436c25
Create Date: 2025-12-23 23:08:54.965314

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b08241e9b6cb'
down_revision = '74dbf5436c25'
branch_labels = None
depends_on = None


def upgrade():
    # Aumentar o tamanho do campo senha_hash de 128 para 256 caracteres
    with op.batch_alter_table('usuarios', schema=None) as batch_op:
        batch_op.alter_column('senha_hash',
               existing_type=sa.String(128),
               type_=sa.String(256),
               existing_nullable=False)


def downgrade():
    # Voltar para 128 caracteres (pode truncar senhas!)
    with op.batch_alter_table('usuarios', schema=None) as batch_op:
        batch_op.alter_column('senha_hash',
               existing_type=sa.String(256),
               type_=sa.String(128),
               existing_nullable=False)
