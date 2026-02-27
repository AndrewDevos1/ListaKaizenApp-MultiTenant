"""Add restaurante_id to lista_mae_itens and fornecedores.

Revision ID: a3c4d5e6f7b8
Revises: f0c1d2e3b4a5
Create Date: 2025-12-30 04:43:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = 'a3c4d5e6f7b8'
down_revision = 'f0c1d2e3b4a5'
branch_labels = None
depends_on = None


def _column_exists(table_name, column_name):
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def _index_exists(table_name, index_name):
    bind = op.get_bind()
    inspector = inspect(bind)
    indexes = [idx['name'] for idx in inspector.get_indexes(table_name)]
    return index_name in indexes


def _unique_constraints(table_name):
    bind = op.get_bind()
    inspector = inspect(bind)
    return inspector.get_unique_constraints(table_name)


def upgrade():
    op.execute(
        "INSERT INTO restaurantes (id, nome, slug, ativo, criado_em, atualizado_em, deletado) "
        "SELECT 1, 'KZN Restaurante', 'kzn', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, FALSE "
        "WHERE NOT EXISTS (SELECT 1 FROM restaurantes WHERE id = 1)"
    )

    with op.batch_alter_table('fornecedores', schema=None) as batch_op:
        if not _column_exists('fornecedores', 'restaurante_id'):
            batch_op.add_column(sa.Column('restaurante_id', sa.Integer(), nullable=True))
            batch_op.create_foreign_key(
                'fk_fornecedores_restaurante',
                'restaurantes',
                ['restaurante_id'],
                ['id']
            )
        if not _index_exists('fornecedores', 'ix_fornecedores_restaurante_id'):
            batch_op.create_index('ix_fornecedores_restaurante_id', ['restaurante_id'])

    op.execute("UPDATE fornecedores SET restaurante_id = 1 WHERE restaurante_id IS NULL")

    with op.batch_alter_table('fornecedores', schema=None) as batch_op:
        batch_op.alter_column('restaurante_id', nullable=False)

    unique_constraints = _unique_constraints('lista_mae_itens')

    with op.batch_alter_table('lista_mae_itens', schema=None) as batch_op:
        if not _column_exists('lista_mae_itens', 'restaurante_id'):
            batch_op.add_column(sa.Column('restaurante_id', sa.Integer(), nullable=True))
            batch_op.create_foreign_key(
                'fk_lista_mae_itens_restaurante',
                'restaurantes',
                ['restaurante_id'],
                ['id']
            )
        if not _index_exists('lista_mae_itens', 'ix_lista_mae_itens_restaurante_id'):
            batch_op.create_index('ix_lista_mae_itens_restaurante_id', ['restaurante_id'])

        for constraint in unique_constraints:
            if constraint.get('column_names') == ['nome']:
                batch_op.drop_constraint(constraint['name'], type_='unique')

    op.execute("UPDATE lista_mae_itens SET restaurante_id = 1 WHERE restaurante_id IS NULL")

    with op.batch_alter_table('lista_mae_itens', schema=None) as batch_op:
        batch_op.alter_column('restaurante_id', nullable=False)
        batch_op.create_unique_constraint(
            'uq_lista_mae_restaurante_nome',
            ['restaurante_id', 'nome']
        )


def downgrade():
    with op.batch_alter_table('lista_mae_itens', schema=None) as batch_op:
        batch_op.drop_constraint('uq_lista_mae_restaurante_nome', type_='unique')
        if _index_exists('lista_mae_itens', 'ix_lista_mae_itens_restaurante_id'):
            batch_op.drop_index('ix_lista_mae_itens_restaurante_id')
        if _column_exists('lista_mae_itens', 'restaurante_id'):
            batch_op.drop_constraint('fk_lista_mae_itens_restaurante', type_='foreignkey')
            batch_op.drop_column('restaurante_id')

    with op.batch_alter_table('fornecedores', schema=None) as batch_op:
        if _index_exists('fornecedores', 'ix_fornecedores_restaurante_id'):
            batch_op.drop_index('ix_fornecedores_restaurante_id')
        if _column_exists('fornecedores', 'restaurante_id'):
            batch_op.drop_constraint('fk_fornecedores_restaurante', type_='foreignkey')
            batch_op.drop_column('restaurante_id')
