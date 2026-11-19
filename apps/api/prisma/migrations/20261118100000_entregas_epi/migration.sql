CREATE TYPE "StatusEntregaEpi" AS ENUM ('PENDENTE', 'ACEITO', 'RECUSADO', 'CANCELADO');
ALTER TYPE "TipoNotificacao" ADD VALUE 'ENTREGA_EPI';
ALTER TABLE "notificacoes" ADD COLUMN "referencia_id" INTEGER, ADD COLUMN "deep_link" TEXT;
CREATE TABLE "entregas_epi" (
  "id" SERIAL PRIMARY KEY,
  "restaurante_id" INTEGER NOT NULL REFERENCES "restaurantes"("id"),
  "funcionario_id" INTEGER NOT NULL REFERENCES "usuarios"("id"),
  "criado_por_id" INTEGER NOT NULL REFERENCES "usuarios"("id"),
  "status" "StatusEntregaEpi" NOT NULL DEFAULT 'PENDENTE',
  "chave_idempotencia" TEXT NOT NULL,
  "chave_ultima_transicao" TEXT,
  "observacoes" TEXT,
  "justificativa_recusa" TEXT,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "aceito_em" TIMESTAMP(3), "recusado_em" TIMESTAMP(3), "cancelado_em" TIMESTAMP(3),
  UNIQUE ("restaurante_id", "chave_idempotencia")
);
CREATE TABLE "entregas_epi_itens" (
  "id" SERIAL PRIMARY KEY,
  "entrega_id" INTEGER NOT NULL REFERENCES "entregas_epi"("id") ON DELETE CASCADE,
  "posicao_id" INTEGER NOT NULL REFERENCES "posicoes_material_almoxarifado"("id"),
  "material_id" INTEGER NOT NULL REFERENCES "materiais_almoxarifado"("id"),
  "variante_id" INTEGER REFERENCES "variantes_material_almoxarifado"("id"),
  "quantidade" DECIMAL(14,3) NOT NULL CHECK ("quantidade" > 0),
  "material_nome_snapshot" TEXT NOT NULL,
  "categoria_snapshot" "CategoriaMaterialAlmoxarifado" NOT NULL,
  "variante_snapshot" TEXT
);
CREATE INDEX "entregas_epi_funcionario_status" ON "entregas_epi"("restaurante_id", "funcionario_id", "status");
