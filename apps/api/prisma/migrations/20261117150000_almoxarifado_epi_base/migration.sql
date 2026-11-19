CREATE TYPE "CategoriaMaterialAlmoxarifado" AS ENUM ('UNIFORME', 'CALCADO', 'EPI', 'FERRAMENTA', 'OUTRO');

CREATE TABLE "materiais_almoxarifado" (
  "id" SERIAL PRIMARY KEY,
  "restaurante_id" INTEGER NOT NULL REFERENCES "restaurantes"("id") ON DELETE RESTRICT,
  "nome" TEXT NOT NULL,
  "categoria" "CategoriaMaterialAlmoxarifado" NOT NULL,
  "retornavel" BOOLEAN NOT NULL,
  "valor_referencia" DECIMAL(14,2) NOT NULL CHECK ("valor_referencia" >= 0),
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  UNIQUE ("restaurante_id", "nome")
);

CREATE TABLE "variantes_material_almoxarifado" (
  "id" SERIAL PRIMARY KEY,
  "material_id" INTEGER NOT NULL REFERENCES "materiais_almoxarifado"("id") ON DELETE RESTRICT,
  "tamanho" TEXT,
  "descricao" TEXT,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "posicoes_material_almoxarifado" (
  "id" SERIAL PRIMARY KEY,
  "restaurante_id" INTEGER NOT NULL REFERENCES "restaurantes"("id") ON DELETE RESTRICT,
  "material_id" INTEGER NOT NULL REFERENCES "materiais_almoxarifado"("id") ON DELETE RESTRICT,
  "variante_id" INTEGER REFERENCES "variantes_material_almoxarifado"("id") ON DELETE RESTRICT,
  "saldo" DECIMAL(14,3) NOT NULL DEFAULT 0 CHECK ("saldo" >= 0),
  "minimo" DECIMAL(14,3), "localizacao" TEXT, "observacao" TEXT,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL
);
ALTER TABLE "posicoes_material_almoxarifado" ADD CONSTRAINT "posicoes_material_almoxarifado_restaurante_id_material_id_variante_id_key" UNIQUE NULLS NOT DISTINCT ("restaurante_id", "material_id", "variante_id");

CREATE TABLE "movimentos_material_almoxarifado" (
  "id" SERIAL PRIMARY KEY,
  "restaurante_id" INTEGER NOT NULL REFERENCES "restaurantes"("id") ON DELETE RESTRICT,
  "posicao_id" INTEGER NOT NULL REFERENCES "posicoes_material_almoxarifado"("id") ON DELETE RESTRICT,
  "material_id" INTEGER NOT NULL REFERENCES "materiais_almoxarifado"("id") ON DELETE RESTRICT,
  "variante_id" INTEGER REFERENCES "variantes_material_almoxarifado"("id") ON DELETE RESTRICT,
  "tipo" "TipoMovimentacaoAlmoxarifado" NOT NULL CHECK ("tipo" IN ('ENTRADA', 'AJUSTE')),
  "quantidade" DECIMAL(14,3) NOT NULL CHECK ("quantidade" > 0),
  "saldo_anterior" DECIMAL(14,3) NOT NULL,
  "saldo_novo" DECIMAL(14,3) NOT NULL CHECK ("saldo_novo" >= 0),
  "motivo" TEXT NOT NULL, "responsavel_id" INTEGER NOT NULL, "responsavel_nome" TEXT NOT NULL,
  "chave_idempotencia" TEXT NOT NULL, "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("restaurante_id", "chave_idempotencia")
);
CREATE INDEX "movimentos_material_almoxarifado_posicao_criado" ON "movimentos_material_almoxarifado"("posicao_id", "criado_em");

CREATE FUNCTION movimentos_material_almoxarifado_append_only() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'movimentos_material_almoxarifado é append-only (% bloqueado)', TG_OP; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER movimentos_material_almoxarifado_no_update_delete BEFORE UPDATE OR DELETE ON "movimentos_material_almoxarifado" FOR EACH ROW EXECUTE FUNCTION movimentos_material_almoxarifado_append_only();
