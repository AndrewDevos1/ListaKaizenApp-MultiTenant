"""add area_colaborador and area_id to listas

Revision ID: c718ca9a2883
Revises: 9f7d5b95f5b4
Create Date: 2026-02-25 21:36:51.288769

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c718ca9a2883'
down_revision = '9f7d5b95f5b4'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('area_colaborador',
    sa.Column('area_id', sa.Integer(), nullable=False),
    sa.Column('usuario_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['area_id'], ['areas.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('area_id', 'usuario_id')
    )
    with op.batch_alter_table('listas', schema=None) as batch_op:
        batch_op.add_column(sa.Column('area_id', sa.Integer(), nullable=True))
        batch_op.create_index(batch_op.f('ix_listas_area_id'), ['area_id'], unique=False)
        batch_op.create_foreign_key('fk_listas_area_id', 'areas', ['area_id'], ['id'], ondelete='SET NULL')


def downgrade():
    with op.batch_alter_table('listas', schema=None) as batch_op:
        batch_op.drop_constraint('fk_listas_area_id', type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_listas_area_id'))
        batch_op.drop_column('area_id')

    op.drop_table('area_colaborador')
