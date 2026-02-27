"""Tornar submissao_id nullable em Checklist

Revision ID: 827125e1bf9c
Revises: 92ebf6077eb3
Create Date: 2025-12-29 17:34:33.829168

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '827125e1bf9c'
down_revision = '92ebf6077eb3'
branch_labels = None
depends_on = None


def upgrade():
    # Tornar submissao_id nullable em checklists para suportar listas rápidas
    with op.batch_alter_table('checklists', schema=None) as batch_op:
        batch_op.alter_column('submissao_id',
               existing_type=sa.INTEGER(),
               nullable=True)


def downgrade():
    # Reverter submissao_id para NOT NULL
    with op.batch_alter_table('checklists', schema=None) as batch_op:
        batch_op.alter_column('submissao_id',
               existing_type=sa.INTEGER(),
               nullable=False)
