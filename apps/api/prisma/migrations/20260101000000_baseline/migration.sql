-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'COLLABORATOR', 'SUPPLIER');

-- CreateEnum
CREATE TYPE "StatusListaRapida" AS ENUM ('RASCUNHO', 'PENDENTE', 'APROVADO', 'REJEITADO', 'ARQUIVADO');

-- CreateEnum
CREATE TYPE "StatusSugestao" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO');

-- CreateEnum
CREATE TYPE "TipoPOP" AS ENUM ('ABERTURA', 'FECHAMENTO', 'LIMPEZA', 'OPERACIONAL', 'PERSONALIZADO');

-- CreateEnum
CREATE TYPE "StatusPOPExecucao" AS ENUM ('EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "StatusCotacao" AS ENUM ('ABERTA', 'FECHADA');

-- CreateEnum
CREATE TYPE "StatusChecklist" AS ENUM ('ABERTO', 'FINALIZADO');

-- CreateEnum
CREATE TYPE "StatusSubmissao" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO', 'PARCIAL', 'ARQUIVADO');

-- CreateEnum
CREATE TYPE "StatusLoteConsolidado" AS ENUM ('AGUARDANDO_SUBLISTAS', 'PRONTO_PARA_APROVAR', 'APROVADO_PARCIAL', 'APROVADO_COMPLETO');

-- CreateEnum
CREATE TYPE "StatusPedido" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO');

-- CreateEnum
CREATE TYPE "TipoNotificacao" AS ENUM ('SUBMISSAO_PENDENTE', 'SUBMISSAO_APROVADA', 'SUBMISSAO_REJEITADA', 'RECEBIMENTO_CONFIRMADO', 'LISTA_RAPIDA_PENDENTE', 'LISTA_RAPIDA_APROVADA', 'LISTA_RAPIDA_REJEITADA', 'SUGESTAO_APROVADA', 'SUGESTAO_REJEITADA');

-- CreateTable
CREATE TABLE "restaurantes" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "restaurantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "senha" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'COLLABORATOR',
    "aprovado" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "restaurante_id" INTEGER,
    "session_token" TEXT,
    "avatar_url" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "navbar_layouts" (
    "role" "UserRole" NOT NULL,
    "hidden_group_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hidden_item_keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "navbar_layouts_pkey" PRIMARY KEY ("role")
);

-- CreateTable
CREATE TABLE "usuario_navbar_estilos" (
    "usuario_id" INTEGER NOT NULL,
    "style" TEXT NOT NULL DEFAULT 'current',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuario_navbar_estilos_pkey" PRIMARY KEY ("usuario_id")
);

-- CreateTable
CREATE TABLE "itens" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "unidade_medida" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "restaurante_id" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fornecedor_id" INTEGER,

    CONSTRAINT "itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "restaurante_id" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "area_colaborador" (
    "id" SERIAL NOT NULL,
    "area_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,

    CONSTRAINT "area_colaborador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listas" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "restaurante_id" INTEGER NOT NULL,
    "area_id" INTEGER,
    "nome_grupo" TEXT,
    "grupo_id" INTEGER,
    "lista_pai_id" INTEGER,
    "deletado" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listas_grupos" (
    "id" SERIAL NOT NULL,
    "restaurante_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listas_grupos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lista_colaborador" (
    "id" SERIAL NOT NULL,
    "lista_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,

    CONSTRAINT "lista_colaborador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lista_item_ref" (
    "id" SERIAL NOT NULL,
    "lista_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "quantidade_minima" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quantidade_atual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "usa_threshold" BOOLEAN NOT NULL DEFAULT true,
    "qtd_fardo" DOUBLE PRECISION,

    CONSTRAINT "lista_item_ref_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fornecedores" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "restaurante_id" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fornecedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissoes" (
    "id" SERIAL NOT NULL,
    "lista_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "restaurante_id" INTEGER NOT NULL,
    "status" "StatusSubmissao" NOT NULL DEFAULT 'PENDENTE',
    "arquivada" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submissoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissoes_consolidadas_lotes" (
    "id" SERIAL NOT NULL,
    "restaurante_id" INTEGER NOT NULL,
    "grupo_id" INTEGER,
    "lista_pai_id" INTEGER,
    "janela_inicio" TIMESTAMP(3) NOT NULL,
    "janela_fim" TIMESTAMP(3) NOT NULL,
    "status" "StatusLoteConsolidado" NOT NULL DEFAULT 'AGUARDANDO_SUBLISTAS',
    "aprovado_em" TIMESTAMP(3),
    "aprovado_por_id" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submissoes_consolidadas_lotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissoes_consolidadas_participantes" (
    "id" SERIAL NOT NULL,
    "lote_id" INTEGER NOT NULL,
    "lista_id" INTEGER NOT NULL,
    "submissao_atual_id" INTEGER,
    "recebida" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submissoes_consolidadas_participantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos" (
    "id" SERIAL NOT NULL,
    "submissao_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "qtd_solicitada" DOUBLE PRECISION NOT NULL,
    "status" "StatusPedido" NOT NULL DEFAULT 'PENDENTE',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recebimentos" (
    "id" SERIAL NOT NULL,
    "submissao_id" INTEGER NOT NULL,
    "restaurante_id" INTEGER NOT NULL,
    "confirmado_por_id" INTEGER,
    "confirmado_em" TIMESTAMP(3),
    "confirmado_admin_id" INTEGER,
    "confirmado_admin_em" TIMESTAMP(3),
    "observacoes" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recebimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recebimento_itens" (
    "id" SERIAL NOT NULL,
    "recebimento_id" INTEGER NOT NULL,
    "pedido_id" INTEGER NOT NULL,
    "confirmado" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recebimento_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotacoes" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT,
    "status" "StatusCotacao" NOT NULL DEFAULT 'ABERTA',
    "restaurante_id" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cotacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotacao_itens" (
    "id" SERIAL NOT NULL,
    "cotacao_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "fornecedor_id" INTEGER,
    "qtd_solicitada" DOUBLE PRECISION NOT NULL,
    "preco_unitario" DOUBLE PRECISION,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cotacao_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklists" (
    "id" SERIAL NOT NULL,
    "submissao_id" INTEGER NOT NULL,
    "status" "StatusChecklist" NOT NULL DEFAULT 'ABERTO',
    "restaurante_id" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_itens" (
    "id" SERIAL NOT NULL,
    "checklist_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "qtd_pedida" DOUBLE PRECISION NOT NULL,
    "marcado" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listas_rapidas" (
    "id" SERIAL NOT NULL,
    "restaurante_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "status" "StatusListaRapida" NOT NULL DEFAULT 'RASCUNHO',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listas_rapidas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lista_rapida_itens" (
    "id" SERIAL NOT NULL,
    "lista_rapida_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "quantidade" DOUBLE PRECISION,
    "unidade" TEXT,
    "item_id" INTEGER,
    "prioridade" TEXT NOT NULL DEFAULT 'prevencao',
    "observacao" TEXT,
    "descartado" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lista_rapida_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sugestoes_itens" (
    "id" SERIAL NOT NULL,
    "restaurante_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "unidade_medida" TEXT NOT NULL,
    "status" "StatusSugestao" NOT NULL DEFAULT 'PENDENTE',
    "item_criado_id" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sugestoes_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pop_templates" (
    "id" SERIAL NOT NULL,
    "restaurante_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoPOP" NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pop_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pop_passos" (
    "id" SERIAL NOT NULL,
    "template_id" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,

    CONSTRAINT "pop_passos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pop_execucoes" (
    "id" SERIAL NOT NULL,
    "template_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "restaurante_id" INTEGER NOT NULL,
    "status" "StatusPOPExecucao" NOT NULL DEFAULT 'EM_ANDAMENTO',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pop_execucoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pop_execucao_itens" (
    "id" SERIAL NOT NULL,
    "execucao_id" INTEGER NOT NULL,
    "passo_id" INTEGER NOT NULL,
    "marcado" BOOLEAN NOT NULL DEFAULT false,
    "observacao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pop_execucao_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "restaurante_id" INTEGER NOT NULL,
    "tipo" "TipoNotificacao" NOT NULL,
    "mensagem" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "convite_tokens" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT,
    "restaurante_id" INTEGER,
    "role" "UserRole" NOT NULL DEFAULT 'COLLABORATOR',
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "convite_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_logs" (
    "id" SERIAL NOT NULL,
    "restaurante_id" INTEGER,
    "usuario_id" INTEGER,
    "acao" TEXT NOT NULL,
    "entidade" TEXT,
    "entidade_id" INTEGER,
    "detalhes" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "restaurantes_cnpj_key" ON "restaurantes"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_username_key" ON "usuarios"("username");

-- CreateIndex
CREATE UNIQUE INDEX "area_colaborador_area_id_usuario_id_key" ON "area_colaborador"("area_id", "usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "lista_colaborador_lista_id_usuario_id_key" ON "lista_colaborador"("lista_id", "usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "lista_item_ref_lista_id_item_id_key" ON "lista_item_ref"("lista_id", "item_id");

-- CreateIndex
CREATE INDEX "submissoes_consolidadas_lotes_restaurante_id_status_idx" ON "submissoes_consolidadas_lotes"("restaurante_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "submissoes_consolidadas_participantes_submissao_atual_id_key" ON "submissoes_consolidadas_participantes"("submissao_atual_id");

-- CreateIndex
CREATE INDEX "submissoes_consolidadas_participantes_lista_id_idx" ON "submissoes_consolidadas_participantes"("lista_id");

-- CreateIndex
CREATE UNIQUE INDEX "submissoes_consolidadas_participantes_lote_id_lista_id_key" ON "submissoes_consolidadas_participantes"("lote_id", "lista_id");

-- CreateIndex
CREATE UNIQUE INDEX "recebimentos_submissao_id_key" ON "recebimentos"("submissao_id");

-- CreateIndex
CREATE UNIQUE INDEX "recebimento_itens_pedido_id_key" ON "recebimento_itens"("pedido_id");

-- CreateIndex
CREATE UNIQUE INDEX "recebimento_itens_recebimento_id_pedido_id_key" ON "recebimento_itens"("recebimento_id", "pedido_id");

-- CreateIndex
CREATE UNIQUE INDEX "checklists_submissao_id_key" ON "checklists"("submissao_id");

-- CreateIndex
CREATE UNIQUE INDEX "pop_execucao_itens_execucao_id_passo_id_key" ON "pop_execucao_itens"("execucao_id", "passo_id");

-- CreateIndex
CREATE UNIQUE INDEX "convite_tokens_token_key" ON "convite_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_restaurante_id_fkey" FOREIGN KEY ("restaurante_id") REFERENCES "restaurantes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_navbar_estilos" ADD CONSTRAINT "usuario_navbar_estilos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens" ADD CONSTRAINT "itens_restaurante_id_fkey" FOREIGN KEY ("restaurante_id") REFERENCES "restaurantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens" ADD CONSTRAINT "itens_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "areas" ADD CONSTRAINT "areas_restaurante_id_fkey" FOREIGN KEY ("restaurante_id") REFERENCES "restaurantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "area_colaborador" ADD CONSTRAINT "area_colaborador_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "area_colaborador" ADD CONSTRAINT "area_colaborador_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listas" ADD CONSTRAINT "listas_restaurante_id_fkey" FOREIGN KEY ("restaurante_id") REFERENCES "restaurantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listas" ADD CONSTRAINT "listas_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listas" ADD CONSTRAINT "listas_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "listas_grupos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listas" ADD CONSTRAINT "listas_lista_pai_id_fkey" FOREIGN KEY ("lista_pai_id") REFERENCES "listas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listas_grupos" ADD CONSTRAINT "listas_grupos_restaurante_id_fkey" FOREIGN KEY ("restaurante_id") REFERENCES "restaurantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lista_colaborador" ADD CONSTRAINT "lista_colaborador_lista_id_fkey" FOREIGN KEY ("lista_id") REFERENCES "listas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lista_colaborador" ADD CONSTRAINT "lista_colaborador_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lista_item_ref" ADD CONSTRAINT "lista_item_ref_lista_id_fkey" FOREIGN KEY ("lista_id") REFERENCES "listas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lista_item_ref" ADD CONSTRAINT "lista_item_ref_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "itens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fornecedores" ADD CONSTRAINT "fornecedores_restaurante_id_fkey" FOREIGN KEY ("restaurante_id") REFERENCES "restaurantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissoes" ADD CONSTRAINT "submissoes_lista_id_fkey" FOREIGN KEY ("lista_id") REFERENCES "listas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissoes" ADD CONSTRAINT "submissoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissoes" ADD CONSTRAINT "submissoes_restaurante_id_fkey" FOREIGN KEY ("restaurante_id") REFERENCES "restaurantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissoes_consolidadas_lotes" ADD CONSTRAINT "submissoes_consolidadas_lotes_restaurante_id_fkey" FOREIGN KEY ("restaurante_id") REFERENCES "restaurantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissoes_consolidadas_lotes" ADD CONSTRAINT "submissoes_consolidadas_lotes_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "listas_grupos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissoes_consolidadas_lotes" ADD CONSTRAINT "submissoes_consolidadas_lotes_lista_pai_id_fkey" FOREIGN KEY ("lista_pai_id") REFERENCES "listas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissoes_consolidadas_lotes" ADD CONSTRAINT "submissoes_consolidadas_lotes_aprovado_por_id_fkey" FOREIGN KEY ("aprovado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissoes_consolidadas_participantes" ADD CONSTRAINT "submissoes_consolidadas_participantes_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "submissoes_consolidadas_lotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissoes_consolidadas_participantes" ADD CONSTRAINT "submissoes_consolidadas_participantes_lista_id_fkey" FOREIGN KEY ("lista_id") REFERENCES "listas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissoes_consolidadas_participantes" ADD CONSTRAINT "submissoes_consolidadas_participantes_submissao_atual_id_fkey" FOREIGN KEY ("submissao_atual_id") REFERENCES "submissoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_submissao_id_fkey" FOREIGN KEY ("submissao_id") REFERENCES "submissoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "itens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recebimentos" ADD CONSTRAINT "recebimentos_submissao_id_fkey" FOREIGN KEY ("submissao_id") REFERENCES "submissoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recebimentos" ADD CONSTRAINT "recebimentos_restaurante_id_fkey" FOREIGN KEY ("restaurante_id") REFERENCES "restaurantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recebimentos" ADD CONSTRAINT "recebimentos_confirmado_por_id_fkey" FOREIGN KEY ("confirmado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recebimentos" ADD CONSTRAINT "recebimentos_confirmado_admin_id_fkey" FOREIGN KEY ("confirmado_admin_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recebimento_itens" ADD CONSTRAINT "recebimento_itens_recebimento_id_fkey" FOREIGN KEY ("recebimento_id") REFERENCES "recebimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recebimento_itens" ADD CONSTRAINT "recebimento_itens_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotacoes" ADD CONSTRAINT "cotacoes_restaurante_id_fkey" FOREIGN KEY ("restaurante_id") REFERENCES "restaurantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotacao_itens" ADD CONSTRAINT "cotacao_itens_cotacao_id_fkey" FOREIGN KEY ("cotacao_id") REFERENCES "cotacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotacao_itens" ADD CONSTRAINT "cotacao_itens_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "itens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotacao_itens" ADD CONSTRAINT "cotacao_itens_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklists" ADD CONSTRAINT "checklists_submissao_id_fkey" FOREIGN KEY ("submissao_id") REFERENCES "submissoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklists" ADD CONSTRAINT "checklists_restaurante_id_fkey" FOREIGN KEY ("restaurante_id") REFERENCES "restaurantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_itens" ADD CONSTRAINT "checklist_itens_checklist_id_fkey" FOREIGN KEY ("checklist_id") REFERENCES "checklists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_itens" ADD CONSTRAINT "checklist_itens_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "itens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listas_rapidas" ADD CONSTRAINT "listas_rapidas_restaurante_id_fkey" FOREIGN KEY ("restaurante_id") REFERENCES "restaurantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listas_rapidas" ADD CONSTRAINT "listas_rapidas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lista_rapida_itens" ADD CONSTRAINT "lista_rapida_itens_lista_rapida_id_fkey" FOREIGN KEY ("lista_rapida_id") REFERENCES "listas_rapidas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lista_rapida_itens" ADD CONSTRAINT "lista_rapida_itens_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "itens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sugestoes_itens" ADD CONSTRAINT "sugestoes_itens_restaurante_id_fkey" FOREIGN KEY ("restaurante_id") REFERENCES "restaurantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sugestoes_itens" ADD CONSTRAINT "sugestoes_itens_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sugestoes_itens" ADD CONSTRAINT "sugestoes_itens_item_criado_id_fkey" FOREIGN KEY ("item_criado_id") REFERENCES "itens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pop_templates" ADD CONSTRAINT "pop_templates_restaurante_id_fkey" FOREIGN KEY ("restaurante_id") REFERENCES "restaurantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pop_passos" ADD CONSTRAINT "pop_passos_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "pop_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pop_execucoes" ADD CONSTRAINT "pop_execucoes_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "pop_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pop_execucoes" ADD CONSTRAINT "pop_execucoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pop_execucoes" ADD CONSTRAINT "pop_execucoes_restaurante_id_fkey" FOREIGN KEY ("restaurante_id") REFERENCES "restaurantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pop_execucao_itens" ADD CONSTRAINT "pop_execucao_itens_execucao_id_fkey" FOREIGN KEY ("execucao_id") REFERENCES "pop_execucoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pop_execucao_itens" ADD CONSTRAINT "pop_execucao_itens_passo_id_fkey" FOREIGN KEY ("passo_id") REFERENCES "pop_passos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_restaurante_id_fkey" FOREIGN KEY ("restaurante_id") REFERENCES "restaurantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convite_tokens" ADD CONSTRAINT "convite_tokens_restaurante_id_fkey" FOREIGN KEY ("restaurante_id") REFERENCES "restaurantes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

