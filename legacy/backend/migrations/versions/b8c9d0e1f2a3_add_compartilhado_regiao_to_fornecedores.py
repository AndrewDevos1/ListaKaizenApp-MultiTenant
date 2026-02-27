"""Add compartilhado_regiao to fornecedores

Revision ID: b8c9d0e1f2a3
Revises: 1f2e3d4c5b6a
Create Date: 2026-01-15 09:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b8c9d0e1f2a3'
down_revision = '1f2e3d4c5b6a'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('fornecedores', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('compartilhado_regiao', sa.Boolean(), nullable=False, server_default='0')
        )


def downgrade():
    with op.batch_alter_table('fornecedores', schema=None) as batch_op:
        batch_op.drop_column('compartilhado_regiao')
