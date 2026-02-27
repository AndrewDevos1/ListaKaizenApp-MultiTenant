"""Add navbar_activities table

Revision ID: d4e5f6g7h8i9
Revises: c3d4e5f6a7b8
Create Date: 2026-02-25 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd4e5f6g7h8i9'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'navbar_activities',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('usuario_id', sa.Integer(), sa.ForeignKey('usuarios.id', ondelete='CASCADE'), nullable=False),
        sa.Column('item_key', sa.String(length=80), nullable=False),
        sa.Column('criado_em', sa.DateTime(), nullable=False, server_default=sa.func.now())
    )
    op.create_unique_constraint(
        'uq_navbar_activity_user_item',
        'navbar_activities',
        ['usuario_id', 'item_key']
    )


def downgrade():
    op.drop_constraint('uq_navbar_activity_user_item', 'navbar_activities', type_='unique')
    op.drop_table('navbar_activities')
