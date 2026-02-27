"""add arquivada fields to submissoes and listas_rapidas

Revision ID: d1e2f3a4b5c6
Revises: c1a2b3c4d5e6
Create Date: 2025-01-05 12:30:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd1e2f3a4b5c6'
down_revision = 'c1a2b3c4d5e6'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('submissoes', schema=None) as batch_op:
        batch_op.add_column(sa.Column('arquivada', sa.Boolean(), nullable=False, server_default='false'))
        batch_op.add_column(sa.Column('arquivada_em', sa.DateTime(), nullable=True))

    with op.batch_alter_table('listas_rapidas', schema=None) as batch_op:
        batch_op.add_column(sa.Column('arquivada', sa.Boolean(), nullable=False, server_default='false'))
        batch_op.add_column(sa.Column('arquivada_em', sa.DateTime(), nullable=True))


def downgrade():
    with op.batch_alter_table('listas_rapidas', schema=None) as batch_op:
        batch_op.drop_column('arquivada_em')
        batch_op.drop_column('arquivada')

    with op.batch_alter_table('submissoes', schema=None) as batch_op:
        batch_op.drop_column('arquivada_em')
        batch_op.drop_column('arquivada')
