"""add restaurante_id to listas

Revision ID: f9a3b1c2d4e5
Revises: ef262cbdd9ad
Create Date: 2025-01-01 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f9a3b1c2d4e5'
down_revision = 'ef262cbdd9ad'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('listas') as batch_op:
        batch_op.add_column(sa.Column('restaurante_id', sa.Integer(), nullable=True))
        batch_op.create_index('ix_listas_restaurante_id', ['restaurante_id'])
        batch_op.create_foreign_key(
            'fk_listas_restaurante_id_restaurantes',
            'restaurantes',
            ['restaurante_id'],
            ['id']
        )

    conn = op.get_bind()
    listas = sa.table(
        'listas',
        sa.column('id', sa.Integer()),
        sa.column('restaurante_id', sa.Integer())
    )
    lista_colaborador = sa.table(
        'lista_colaborador',
        sa.column('lista_id', sa.Integer()),
        sa.column('usuario_id', sa.Integer())
    )
    usuarios = sa.table(
        'usuarios',
        sa.column('id', sa.Integer()),
        sa.column('restaurante_id', sa.Integer())
    )
    lista_item_ref = sa.table(
        'lista_item_ref',
        sa.column('lista_id', sa.Integer()),
        sa.column('item_id', sa.Integer())
    )
    lista_mae_itens = sa.table(
        'lista_mae_itens',
        sa.column('id', sa.Integer()),
        sa.column('restaurante_id', sa.Integer())
    )

    lista_restaurantes = {}
    rows = conn.execute(
        sa.select(
            lista_colaborador.c.lista_id,
            usuarios.c.restaurante_id
        ).select_from(
            lista_colaborador.join(usuarios, lista_colaborador.c.usuario_id == usuarios.c.id)
        ).order_by(lista_colaborador.c.lista_id)
    ).fetchall()

    for lista_id, restaurante_id in rows:
        if lista_id not in lista_restaurantes and restaurante_id is not None:
            lista_restaurantes[lista_id] = restaurante_id

    for lista_id, restaurante_id in lista_restaurantes.items():
        conn.execute(
            listas.update().where(listas.c.id == lista_id).values(restaurante_id=restaurante_id)
        )

    rows = conn.execute(
        sa.select(
            lista_item_ref.c.lista_id,
            lista_mae_itens.c.restaurante_id
        ).select_from(
            lista_item_ref.join(lista_mae_itens, lista_item_ref.c.item_id == lista_mae_itens.c.id)
        ).order_by(lista_item_ref.c.lista_id)
    ).fetchall()

    for lista_id, restaurante_id in rows:
        conn.execute(
            listas.update()
            .where(listas.c.id == lista_id)
            .where(listas.c.restaurante_id.is_(None))
            .values(restaurante_id=restaurante_id)
        )


def downgrade():
    with op.batch_alter_table('listas') as batch_op:
        batch_op.drop_constraint('fk_listas_restaurante_id_restaurantes', type_='foreignkey')
        batch_op.drop_index('ix_listas_restaurante_id')
        batch_op.drop_column('restaurante_id')
