"""expand convite fornecedor multiuse

Revision ID: 8a3f4b9c2d1e
Revises: 6d49e2aeb1bf
Create Date: 2026-01-23 01:10:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '8a3f4b9c2d1e'
down_revision = '6d49e2aeb1bf'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('convite_fornecedores', schema=None) as batch_op:
        batch_op.add_column(sa.Column('limite_usos', sa.Integer(), nullable=False, server_default='1'))
        batch_op.add_column(sa.Column('quantidade_usos', sa.Integer(), nullable=False, server_default='0'))
    with op.batch_alter_table('convite_fornecedores', schema=None) as batch_op:
        batch_op.alter_column('limite_usos', server_default=None)
        batch_op.alter_column('quantidade_usos', server_default=None)


def downgrade():
    with op.batch_alter_table('convite_fornecedores', schema=None) as batch_op:
        batch_op.drop_column('quantidade_usos')
        batch_op.drop_column('limite_usos')
