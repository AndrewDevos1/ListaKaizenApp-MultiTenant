"""Add atualizado_em to estoques

Revision ID: b7c3e9d1f2a4
Revises: 415b31d526d2
Create Date: 2026-01-04 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b7c3e9d1f2a4'
down_revision = '415b31d526d2'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('estoques', schema=None) as batch_op:
        batch_op.add_column(sa.Column('atualizado_em', sa.DateTime(), nullable=True))


def downgrade():
    with op.batch_alter_table('estoques', schema=None) as batch_op:
        batch_op.drop_column('atualizado_em')
