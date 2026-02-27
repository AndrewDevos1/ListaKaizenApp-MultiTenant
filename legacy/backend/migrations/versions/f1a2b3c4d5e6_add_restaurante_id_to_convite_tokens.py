"""Add restaurante_id to convite_tokens

Revision ID: f1a2b3c4d5e6
Revises: c1d2e3f4g5h6
Create Date: 2026-01-03 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f1a2b3c4d5e6'
down_revision = 'c1d2e3f4g5h6'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('convite_tokens', schema=None) as batch_op:
        batch_op.add_column(sa.Column('restaurante_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            'fk_convite_tokens_restaurante',
            'restaurantes',
            ['restaurante_id'],
            ['id'],
            ondelete='SET NULL'
        )

    op.execute("""
        UPDATE convite_tokens
        SET restaurante_id = (
            SELECT restaurante_id
            FROM usuarios
            WHERE usuarios.id = convite_tokens.criado_por_id
        )
    """)


def downgrade():
    with op.batch_alter_table('convite_tokens', schema=None) as batch_op:
        batch_op.drop_constraint('fk_convite_tokens_restaurante', type_='foreignkey')
        batch_op.drop_column('restaurante_id')
