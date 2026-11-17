-- Issue #35: catálogo de itens por fornecedor + pré-visualização durável de importação.
-- Colunas novas são opcionais: itens existentes permanecem válidos.
ALTER TABLE "itens"
  ADD COLUMN "codigo_fornecedor" VARCHAR(60),
  ADD COLUMN "marca" VARCHAR(120),
  ADD COLUMN "descricao" TEXT,
  ADD COLUMN "preco_atual" DECIMAL(14,2);

-- CreateEnum
CREATE TYPE "StatusCatalogoImportacao" AS ENUM ('PENDENTE', 'CONFIRMADA');

-- CreateTable
CREATE TABLE "catalogo_importacoes" (
    "id" SERIAL NOT NULL,
    "token" UUID NOT NULL,
    "restaurante_id" INTEGER NOT NULL,
    "fornecedor_id" INTEGER NOT NULL,
    "criado_por_id" INTEGER NOT NULL,
    "formato" VARCHAR(10) NOT NULL,
    "status" "StatusCatalogoImportacao" NOT NULL DEFAULT 'PENDENTE',
    "linhas" JSONB NOT NULL,
    "resultado" JSONB,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "confirmado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalogo_importacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalogo_importacoes_token_key" ON "catalogo_importacoes"("token");
CREATE INDEX "catalogo_importacoes_restaurante_id_fornecedor_id_status_idx" ON "catalogo_importacoes"("restaurante_id", "fornecedor_id", "status");
CREATE INDEX "itens_restaurante_id_fornecedor_id_ativo_idx" ON "itens"("restaurante_id", "fornecedor_id", "ativo");
-- NULLs são distintos no Postgres: só códigos informados são únicos por (restaurante, fornecedor).
CREATE UNIQUE INDEX "itens_restaurante_id_fornecedor_id_codigo_fornecedor_key" ON "itens"("restaurante_id", "fornecedor_id", "codigo_fornecedor");

-- AddForeignKey
ALTER TABLE "catalogo_importacoes" ADD CONSTRAINT "catalogo_importacoes_restaurante_id_fkey" FOREIGN KEY ("restaurante_id") REFERENCES "restaurantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "catalogo_importacoes" ADD CONSTRAINT "catalogo_importacoes_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
