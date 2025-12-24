"""Add responsavel and observacao to fornecedores

Revision ID: f4c8a2d9b7e1
Revises: dc03c5827d09
Create Date: 2025-12-24 09:35:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = 'f4c8a2d9b7e1'
down_revision = 'dc03c5827d09'
branch_labels = None
depends_on = None


def _column_exists(table_name, column_name):
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade():
    with op.batch_alter_table('fornecedores', schema=None) as batch_op:
        if not _column_exists('fornecedores', 'responsavel'):
            batch_op.add_column(sa.Column('responsavel', sa.String(length=100), nullable=True))
        if not _column_exists('fornecedores', 'observacao'):
            batch_op.add_column(sa.Column('observacao', sa.String(length=600), nullable=True))


def downgrade():
    with op.batch_alter_table('fornecedores', schema=None) as batch_op:
        if _column_exists('fornecedores', 'observacao'):
            batch_op.drop_column('observacao')
        if _column_exists('fornecedores', 'responsavel'):
            batch_op.drop_column('responsavel')
