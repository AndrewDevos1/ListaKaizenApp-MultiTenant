"""Tornar quantidade e unidade nullable em ChecklistItem

Revision ID: 67549846fa66
Revises: 827125e1bf9c
Create Date: 2025-12-29 17:43:53.366809

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '67549846fa66'
down_revision = '827125e1bf9c'
branch_labels = None
depends_on = None


def upgrade():
    # Tornar quantidade e unidade nullable em checklist_itens para suportar listas rápidas
    with op.batch_alter_table('checklist_itens', schema=None) as batch_op:
        batch_op.alter_column('quantidade',
               existing_type=sa.NUMERIC(precision=10, scale=2),
               nullable=True)
        batch_op.alter_column('unidade',
               existing_type=sa.VARCHAR(length=50),
               nullable=True)


def downgrade():
    # Reverter quantidade e unidade para NOT NULL
    with op.batch_alter_table('checklist_itens', schema=None) as batch_op:
        batch_op.alter_column('unidade',
               existing_type=sa.VARCHAR(length=50),
               nullable=False)
        batch_op.alter_column('quantidade',
               existing_type=sa.NUMERIC(precision=10, scale=2),
               nullable=False)
