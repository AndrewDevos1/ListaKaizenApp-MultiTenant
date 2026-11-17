-- CreateEnum
CREATE TYPE "OrigemPreco" AS ENUM ('CATALOGO');

-- CreateTable
CREATE TABLE "historico_precos_item" (
    "id" SERIAL NOT NULL,
    "restaurante_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "fornecedor_id" INTEGER,
    "preco_anterior" DECIMAL(14,2),
    "preco_novo" DECIMAL(14,2) NOT NULL,
    "moeda" VARCHAR(3) NOT NULL DEFAULT 'BRL',
    "autor_id" INTEGER NOT NULL,
    "autor_nome" TEXT NOT NULL,
    "origem" "OrigemPreco" NOT NULL DEFAULT 'CATALOGO',
    "observacao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historico_precos_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "historico_precos_item_restaurante_id_item_id_criado_em_idx" ON "historico_precos_item"("restaurante_id", "item_id", "criado_em" DESC);

-- AddForeignKey
ALTER TABLE "historico_precos_item" ADD CONSTRAINT "historico_precos_item_restaurante_id_fkey" FOREIGN KEY ("restaurante_id") REFERENCES "restaurantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_precos_item" ADD CONSTRAINT "historico_precos_item_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "itens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_precos_item" ADD CONSTRAINT "historico_precos_item_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Append-only: o histórico é imutável (issue #36). UPDATE/DELETE são rejeitados pelo banco.
ALTER TABLE "historico_precos_item" ADD CONSTRAINT "historico_precos_item_preco_nao_negativo" CHECK ("preco_novo" >= 0 AND ("preco_anterior" IS NULL OR "preco_anterior" >= 0));

CREATE FUNCTION "historico_precos_item_imutavel"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'historico_precos_item e append-only (% bloqueado)', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "historico_precos_item_sem_alteracao"
BEFORE UPDATE OR DELETE ON "historico_precos_item"
FOR EACH ROW EXECUTE FUNCTION "historico_precos_item_imutavel"();
