-- CreateEnum
CREATE TYPE "TipoMovimentacaoAlmoxarifado" AS ENUM ('ENTRADA', 'SAIDA', 'AJUSTE');

-- CreateTable
CREATE TABLE "almoxarifado_posicoes" (
    "id" SERIAL NOT NULL,
    "restaurante_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "saldo" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "minimo" DECIMAL(14,3),
    "localizacao" TEXT,
    "observacao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "almoxarifado_posicoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "almoxarifado_movimentacoes" (
    "id" SERIAL NOT NULL,
    "restaurante_id" INTEGER NOT NULL,
    "posicao_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "tipo" "TipoMovimentacaoAlmoxarifado" NOT NULL,
    "quantidade" DECIMAL(14,3) NOT NULL,
    "saldo_anterior" DECIMAL(14,3) NOT NULL,
    "saldo_novo" DECIMAL(14,3) NOT NULL,
    "motivo" TEXT NOT NULL,
    "responsavel_id" INTEGER NOT NULL,
    "responsavel_nome" TEXT NOT NULL,
    "chave_idempotencia" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "almoxarifado_movimentacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "almoxarifado_posicoes_restaurante_id_item_id_key" ON "almoxarifado_posicoes"("restaurante_id", "item_id");

-- CreateIndex
CREATE INDEX "almoxarifado_movimentacoes_posicao_id_criado_em_idx" ON "almoxarifado_movimentacoes"("posicao_id", "criado_em");

-- CreateIndex
CREATE UNIQUE INDEX "almoxarifado_movimentacoes_restaurante_id_chave_idempotenci_key" ON "almoxarifado_movimentacoes"("restaurante_id", "chave_idempotencia");

-- AddForeignKey
ALTER TABLE "almoxarifado_posicoes" ADD CONSTRAINT "almoxarifado_posicoes_restaurante_id_fkey" FOREIGN KEY ("restaurante_id") REFERENCES "restaurantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almoxarifado_posicoes" ADD CONSTRAINT "almoxarifado_posicoes_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "itens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almoxarifado_movimentacoes" ADD CONSTRAINT "almoxarifado_movimentacoes_restaurante_id_fkey" FOREIGN KEY ("restaurante_id") REFERENCES "restaurantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almoxarifado_movimentacoes" ADD CONSTRAINT "almoxarifado_movimentacoes_posicao_id_fkey" FOREIGN KEY ("posicao_id") REFERENCES "almoxarifado_posicoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almoxarifado_movimentacoes" ADD CONSTRAINT "almoxarifado_movimentacoes_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "itens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Integridade: saldo nunca negativo, quantidade positiva
ALTER TABLE "almoxarifado_posicoes" ADD CONSTRAINT "almoxarifado_posicoes_saldo_nao_negativo" CHECK ("saldo" >= 0);
ALTER TABLE "almoxarifado_movimentacoes" ADD CONSTRAINT "almoxarifado_movimentacoes_quantidade_positiva" CHECK ("quantidade" > 0 AND "saldo_novo" >= 0);

-- Append-only: bloqueia UPDATE/DELETE no histórico
CREATE OR REPLACE FUNCTION almoxarifado_movimentacoes_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'almoxarifado_movimentacoes é append-only (% bloqueado)', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER almoxarifado_movimentacoes_no_update_delete
BEFORE UPDATE OR DELETE ON "almoxarifado_movimentacoes"
FOR EACH ROW EXECUTE FUNCTION almoxarifado_movimentacoes_append_only();
