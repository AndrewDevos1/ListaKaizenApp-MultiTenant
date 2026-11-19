CREATE TABLE "termos_responsabilidade" (
  "id" SERIAL PRIMARY KEY,
  "restaurante_id" INTEGER NOT NULL,
  "versao" TEXT NOT NULL,
  "texto" TEXT NOT NULL,
  "hash_termo" TEXT NOT NULL,
  "criado_por_id" INTEGER NOT NULL,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("restaurante_id", "versao")
);
CREATE TABLE "aceites_termos_epi" (
  "id" SERIAL PRIMARY KEY,
  "restaurante_id" INTEGER NOT NULL,
  "entrega_id" INTEGER NOT NULL UNIQUE,
  "termo_id" INTEGER NOT NULL,
  "funcionario_id" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "hash_snapshot" TEXT NOT NULL,
  "hash_assinatura" TEXT NOT NULL,
  "hash_documento" TEXT NOT NULL,
  "hash_pdf" TEXT NOT NULL,
  "storage_key" TEXT NOT NULL,
  "hash_payload" TEXT NOT NULL,
  "aceito_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "entregas_epi_itens" ADD COLUMN "valor_referencia_snapshot" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "entregas_epi_itens" ALTER COLUMN "valor_referencia_snapshot" DROP DEFAULT;
ALTER TABLE "entregas_epi_itens" ADD COLUMN "condicao_snapshot" TEXT NOT NULL DEFAULT 'Conforme entregue';
ALTER TABLE "termos_responsabilidade" ADD CONSTRAINT "termos_responsabilidade_restaurante_id_fkey" FOREIGN KEY ("restaurante_id") REFERENCES "restaurantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "termos_responsabilidade" ADD CONSTRAINT "termos_responsabilidade_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "aceites_termos_epi" ADD CONSTRAINT "aceites_termos_epi_restaurante_id_fkey" FOREIGN KEY ("restaurante_id") REFERENCES "restaurantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "aceites_termos_epi" ADD CONSTRAINT "aceites_termos_epi_entrega_id_fkey" FOREIGN KEY ("entrega_id") REFERENCES "entregas_epi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "aceites_termos_epi" ADD CONSTRAINT "aceites_termos_epi_termo_id_fkey" FOREIGN KEY ("termo_id") REFERENCES "termos_responsabilidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "aceites_termos_epi" ADD CONSTRAINT "aceites_termos_epi_funcionario_id_fkey" FOREIGN KEY ("funcionario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "aceites_termos_epi_restaurante_id_funcionario_id_idx" ON "aceites_termos_epi"("restaurante_id", "funcionario_id");
