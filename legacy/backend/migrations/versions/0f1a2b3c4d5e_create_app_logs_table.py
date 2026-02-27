"""create app logs table

Revision ID: 0f1a2b3c4d5e
Revises: f9a3b1c2d4e5
Create Date: 2026-01-20 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0f1a2b3c4d5e'
down_revision = 'f9a3b1c2d4e5'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'app_logs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('criado_em', sa.DateTime(), nullable=False),
        sa.Column('restaurante_id', sa.Integer(), nullable=True),
        sa.Column('usuario_id', sa.Integer(), nullable=True),
        sa.Column('impersonator_id', sa.Integer(), nullable=True),
        sa.Column('acao', sa.String(length=50), nullable=False),
        sa.Column('entidade', sa.String(length=50), nullable=True),
        sa.Column('entidade_id', sa.Integer(), nullable=True),
        sa.Column('mensagem', sa.String(length=255), nullable=True),
        sa.Column('meta', sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(['restaurante_id'], ['restaurantes.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['impersonator_id'], ['usuarios.id'], ondelete='SET NULL'),
    )
    op.create_index('ix_app_logs_criado_em', 'app_logs', ['criado_em'])
    op.create_index('ix_app_logs_restaurante_id', 'app_logs', ['restaurante_id'])
    op.create_index('ix_app_logs_usuario_id', 'app_logs', ['usuario_id'])
    op.create_index('ix_app_logs_impersonator_id', 'app_logs', ['impersonator_id'])
    op.create_index('ix_app_logs_acao', 'app_logs', ['acao'])
    op.create_index('ix_app_logs_entidade', 'app_logs', ['entidade'])
    op.create_index('ix_app_logs_entidade_id', 'app_logs', ['entidade_id'])


def downgrade():
    op.drop_index('ix_app_logs_entidade_id', table_name='app_logs')
    op.drop_index('ix_app_logs_entidade', table_name='app_logs')
    op.drop_index('ix_app_logs_acao', table_name='app_logs')
    op.drop_index('ix_app_logs_impersonator_id', table_name='app_logs')
    op.drop_index('ix_app_logs_usuario_id', table_name='app_logs')
    op.drop_index('ix_app_logs_restaurante_id', table_name='app_logs')
    op.drop_index('ix_app_logs_criado_em', table_name='app_logs')
    op.drop_table('app_logs')
