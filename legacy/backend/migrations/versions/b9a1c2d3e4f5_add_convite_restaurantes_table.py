"""Add convite_restaurantes table

Revision ID: b9a1c2d3e4f5
Revises: f1a2b3c4d5e6
Create Date: 2026-01-06 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b9a1c2d3e4f5'
down_revision = 'f1a2b3c4d5e6'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'convite_restaurantes',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('token', sa.String(length=64), nullable=False),
        sa.Column('criado_por_id', sa.Integer(), nullable=False),
        sa.Column('criado_em', sa.DateTime(), nullable=False),
        sa.Column('expira_em', sa.DateTime(), nullable=True),
        sa.Column('usado', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('usado_em', sa.DateTime(), nullable=True),
        sa.Column('usado_por_id', sa.Integer(), nullable=True),
        sa.Column('restaurante_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['criado_por_id'], ['usuarios.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['usado_por_id'], ['usuarios.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['restaurante_id'], ['restaurantes.id'], ondelete='SET NULL'),
    )
    op.create_index(
        'ix_convite_restaurantes_token',
        'convite_restaurantes',
        ['token'],
        unique=True
    )


def downgrade():
    op.drop_index('ix_convite_restaurantes_token', table_name='convite_restaurantes')
    op.drop_table('convite_restaurantes')
