"""add pop checklists diarios

Revision ID: b7c2d9e0f1a2
Revises: f1a2b3c4d5e6
Create Date: 2025-01-23 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b7c2d9e0f1a2'
down_revision = 'f1a2b3c4d5e6'
branch_labels = None
depends_on = None


def upgrade():
    tipoverificacao = sa.Enum('checkbox', 'medicao', 'temperatura', 'foto', 'texto', name='tipoverificacao', native_enum=False)
    criticidadetarefa = sa.Enum('baixa', 'normal', 'alta', 'critica', name='criticidadetarefa', native_enum=False)
    recorrencialista = sa.Enum('diaria', 'semanal', 'mensal', 'sob_demanda', name='recorrencialista', native_enum=False)
    statusexecucao = sa.Enum('em_andamento', 'concluido', 'parcial', name='statusexecucao', native_enum=False)

    op.create_table(
        'pop_configuracoes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('restaurante_id', sa.Integer(), nullable=False),
        sa.Column('auto_arquivar', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('periodo_arquivamento_dias', sa.Integer(), nullable=False, server_default=sa.text('7')),
        sa.Column('hora_execucao_arquivamento', sa.Time(), nullable=True),
        sa.Column('ultimo_auto_arquivamento_em', sa.DateTime(), nullable=True),
        sa.Column('criado_em', sa.DateTime(), nullable=False),
        sa.Column('atualizado_em', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['restaurante_id'], ['restaurantes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('restaurante_id', name='uq_pop_config_restaurante')
    )

    op.create_table(
        'pop_categorias',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('restaurante_id', sa.Integer(), nullable=False),
        sa.Column('nome', sa.String(length=100), nullable=False),
        sa.Column('descricao', sa.Text(), nullable=True),
        sa.Column('icone', sa.String(length=50), nullable=True),
        sa.Column('cor', sa.String(length=20), nullable=True),
        sa.Column('ordem', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('ativo', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('criado_em', sa.DateTime(), nullable=False),
        sa.Column('atualizado_em', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['restaurante_id'], ['restaurantes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('restaurante_id', 'nome', name='uq_pop_categorias_restaurante_nome')
    )
    op.create_index('idx_pop_categorias_restaurante', 'pop_categorias', ['restaurante_id'])

    op.create_table(
        'pop_templates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('restaurante_id', sa.Integer(), nullable=False),
        sa.Column('categoria_id', sa.Integer(), nullable=True),
        sa.Column('area_id', sa.Integer(), nullable=True),
        sa.Column('titulo', sa.String(length=200), nullable=False),
        sa.Column('descricao', sa.Text(), nullable=True),
        sa.Column('instrucoes', sa.Text(), nullable=True),
        sa.Column('tipo_verificacao', tipoverificacao, nullable=False),
        sa.Column('requer_foto', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('requer_medicao', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('unidade_medicao', sa.String(length=50), nullable=True),
        sa.Column('valor_minimo', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('valor_maximo', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('criticidade', criticidadetarefa, nullable=False),
        sa.Column('tempo_estimado', sa.Integer(), nullable=True),
        sa.Column('ordem', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('ativo', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('criado_por_id', sa.Integer(), nullable=True),
        sa.Column('criado_em', sa.DateTime(), nullable=False),
        sa.Column('atualizado_em', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['area_id'], ['areas.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['categoria_id'], ['pop_categorias.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['criado_por_id'], ['usuarios.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['restaurante_id'], ['restaurantes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('restaurante_id', 'titulo', name='uq_pop_templates_restaurante_titulo')
    )
    op.create_index('idx_pop_templates_restaurante', 'pop_templates', ['restaurante_id'])
    op.create_index('idx_pop_templates_categoria', 'pop_templates', ['categoria_id'])
    op.create_index('idx_pop_templates_area', 'pop_templates', ['area_id'])

    op.create_table(
        'pop_listas',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('restaurante_id', sa.Integer(), nullable=False),
        sa.Column('area_id', sa.Integer(), nullable=True),
        sa.Column('categoria_id', sa.Integer(), nullable=True),
        sa.Column('nome', sa.String(length=200), nullable=False),
        sa.Column('descricao', sa.Text(), nullable=True),
        sa.Column('recorrencia', recorrencialista, nullable=False),
        sa.Column('dias_semana', sa.String(length=50), nullable=True),
        sa.Column('horario_sugerido', sa.Time(), nullable=True),
        sa.Column('publico', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('tempo_estimado_total', sa.Integer(), nullable=True),
        sa.Column('ativo', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('deletado', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('criado_por_id', sa.Integer(), nullable=True),
        sa.Column('criado_em', sa.DateTime(), nullable=False),
        sa.Column('atualizado_em', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['area_id'], ['areas.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['categoria_id'], ['pop_categorias.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['criado_por_id'], ['usuarios.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['restaurante_id'], ['restaurantes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('restaurante_id', 'nome', name='uq_pop_listas_restaurante_nome')
    )
    op.create_index('idx_pop_listas_restaurante', 'pop_listas', ['restaurante_id'])
    op.create_index('idx_pop_listas_area', 'pop_listas', ['area_id'])
    op.create_index('idx_pop_listas_ativo', 'pop_listas', ['ativo', 'deletado'])

    op.create_table(
        'pop_lista_tarefas',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('lista_id', sa.Integer(), nullable=False),
        sa.Column('template_id', sa.Integer(), nullable=False),
        sa.Column('ordem', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('obrigatoria', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('requer_foto_override', sa.Boolean(), nullable=True),
        sa.Column('requer_medicao_override', sa.Boolean(), nullable=True),
        sa.Column('criado_em', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['lista_id'], ['pop_listas.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['template_id'], ['pop_templates.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('lista_id', 'template_id', name='uq_pop_lista_tarefas_lista_template')
    )
    op.create_index('idx_pop_lista_tarefas_lista', 'pop_lista_tarefas', ['lista_id'])
    op.create_index('idx_pop_lista_tarefas_template', 'pop_lista_tarefas', ['template_id'])

    op.create_table(
        'pop_lista_colaboradores',
        sa.Column('lista_id', sa.Integer(), nullable=False),
        sa.Column('usuario_id', sa.Integer(), nullable=False),
        sa.Column('criado_em', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['lista_id'], ['pop_listas.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('lista_id', 'usuario_id')
    )
    op.create_index('idx_pop_lista_colab_lista', 'pop_lista_colaboradores', ['lista_id'])
    op.create_index('idx_pop_lista_colab_usuario', 'pop_lista_colaboradores', ['usuario_id'])

    op.create_table(
        'pop_execucoes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('lista_id', sa.Integer(), nullable=False),
        sa.Column('usuario_id', sa.Integer(), nullable=False),
        sa.Column('restaurante_id', sa.Integer(), nullable=False),
        sa.Column('iniciado_em', sa.DateTime(), nullable=False),
        sa.Column('finalizado_em', sa.DateTime(), nullable=True),
        sa.Column('data_referencia', sa.Date(), nullable=False),
        sa.Column('status', statusexecucao, nullable=False),
        sa.Column('progresso', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_tarefas', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('tarefas_concluidas', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('tarefas_com_desvio', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('assinatura_digital', sa.Text(), nullable=True),
        sa.Column('observacoes', sa.Text(), nullable=True),
        sa.Column('revisado', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('revisado_por_id', sa.Integer(), nullable=True),
        sa.Column('revisado_em', sa.DateTime(), nullable=True),
        sa.Column('observacoes_revisao', sa.Text(), nullable=True),
        sa.Column('arquivado', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('arquivado_em', sa.DateTime(), nullable=True),
        sa.Column('arquivado_por_id', sa.Integer(), nullable=True),
        sa.Column('criado_em', sa.DateTime(), nullable=False),
        sa.Column('atualizado_em', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['arquivado_por_id'], ['usuarios.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['lista_id'], ['pop_listas.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['restaurante_id'], ['restaurantes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['revisado_por_id'], ['usuarios.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_pop_execucoes_lista', 'pop_execucoes', ['lista_id'])
    op.create_index('idx_pop_execucoes_usuario', 'pop_execucoes', ['usuario_id'])
    op.create_index('idx_pop_execucoes_restaurante', 'pop_execucoes', ['restaurante_id'])
    op.create_index('idx_pop_execucoes_data_ref', 'pop_execucoes', ['data_referencia'])
    op.create_index('idx_pop_execucoes_status', 'pop_execucoes', ['status'])

    op.create_table(
        'pop_execucao_itens',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('execucao_id', sa.Integer(), nullable=False),
        sa.Column('template_id', sa.Integer(), nullable=False),
        sa.Column('lista_tarefa_id', sa.Integer(), nullable=True),
        sa.Column('titulo', sa.String(length=200), nullable=False),
        sa.Column('descricao', sa.Text(), nullable=True),
        sa.Column('tipo_verificacao', tipoverificacao, nullable=True),
        sa.Column('concluido', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('concluido_em', sa.DateTime(), nullable=True),
        sa.Column('valor_medido', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('unidade_medicao', sa.String(length=50), nullable=True),
        sa.Column('dentro_padrao', sa.Boolean(), nullable=True),
        sa.Column('foto_url', sa.String(length=500), nullable=True),
        sa.Column('foto_path', sa.String(length=500), nullable=True),
        sa.Column('observacoes', sa.Text(), nullable=True),
        sa.Column('tem_desvio', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('descricao_desvio', sa.Text(), nullable=True),
        sa.Column('acao_corretiva', sa.Text(), nullable=True),
        sa.Column('ordem', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('criado_em', sa.DateTime(), nullable=False),
        sa.Column('atualizado_em', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['execucao_id'], ['pop_execucoes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['lista_tarefa_id'], ['pop_lista_tarefas.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['template_id'], ['pop_templates.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_pop_execucao_itens_execucao', 'pop_execucao_itens', ['execucao_id'])
    op.create_index('idx_pop_execucao_itens_template', 'pop_execucao_itens', ['template_id'])
    op.create_index('idx_pop_execucao_itens_concluido', 'pop_execucao_itens', ['concluido'])
    op.create_index('idx_pop_execucao_itens_desvio', 'pop_execucao_itens', ['tem_desvio'])


def downgrade():
    op.drop_index('idx_pop_execucao_itens_desvio', table_name='pop_execucao_itens')
    op.drop_index('idx_pop_execucao_itens_concluido', table_name='pop_execucao_itens')
    op.drop_index('idx_pop_execucao_itens_template', table_name='pop_execucao_itens')
    op.drop_index('idx_pop_execucao_itens_execucao', table_name='pop_execucao_itens')
    op.drop_table('pop_execucao_itens')

    op.drop_index('idx_pop_execucoes_status', table_name='pop_execucoes')
    op.drop_index('idx_pop_execucoes_data_ref', table_name='pop_execucoes')
    op.drop_index('idx_pop_execucoes_restaurante', table_name='pop_execucoes')
    op.drop_index('idx_pop_execucoes_usuario', table_name='pop_execucoes')
    op.drop_index('idx_pop_execucoes_lista', table_name='pop_execucoes')
    op.drop_table('pop_execucoes')

    op.drop_index('idx_pop_lista_colab_usuario', table_name='pop_lista_colaboradores')
    op.drop_index('idx_pop_lista_colab_lista', table_name='pop_lista_colaboradores')
    op.drop_table('pop_lista_colaboradores')

    op.drop_index('idx_pop_lista_tarefas_template', table_name='pop_lista_tarefas')
    op.drop_index('idx_pop_lista_tarefas_lista', table_name='pop_lista_tarefas')
    op.drop_table('pop_lista_tarefas')

    op.drop_index('idx_pop_listas_ativo', table_name='pop_listas')
    op.drop_index('idx_pop_listas_area', table_name='pop_listas')
    op.drop_index('idx_pop_listas_restaurante', table_name='pop_listas')
    op.drop_table('pop_listas')

    op.drop_index('idx_pop_templates_area', table_name='pop_templates')
    op.drop_index('idx_pop_templates_categoria', table_name='pop_templates')
    op.drop_index('idx_pop_templates_restaurante', table_name='pop_templates')
    op.drop_table('pop_templates')

    op.drop_index('idx_pop_categorias_restaurante', table_name='pop_categorias')
    op.drop_table('pop_categorias')

    op.drop_table('pop_configuracoes')

    statusexecucao = sa.Enum('em_andamento', 'concluido', 'parcial', name='statusexecucao', native_enum=False)
    recorrencialista = sa.Enum('diaria', 'semanal', 'mensal', 'sob_demanda', name='recorrencialista', native_enum=False)
    criticidadetarefa = sa.Enum('baixa', 'normal', 'alta', 'critica', name='criticidadetarefa', native_enum=False)
    tipoverificacao = sa.Enum('checkbox', 'medicao', 'temperatura', 'foto', 'texto', name='tipoverificacao', native_enum=False)

    statusexecucao.drop(op.get_bind(), checkfirst=True)
    recorrencialista.drop(op.get_bind(), checkfirst=True)
    criticidadetarefa.drop(op.get_bind(), checkfirst=True)
    tipoverificacao.drop(op.get_bind(), checkfirst=True)
