CREATE TABLE "termos_responsabilidade" (
  "id" SERIAL PRIMARY KEY,
  "restaurante_id" INTEGER NOT NULL REFERENCES "restaurantes"("id") ON DELETE RESTRICT,
  "versao" TEXT NOT NULL,
  "texto" TEXT NOT NULL,
  "hash_termo" TEXT NOT NULL,
  "criado_por_id" INTEGER NOT NULL REFERENCES "usuarios"("id") ON DELETE RESTRICT,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("restaurante_id", "versao")
);
CREATE TABLE "aceites_termos_epi" (
  "id" SERIAL PRIMARY KEY,
  "restaurante_id" INTEGER NOT NULL REFERENCES "restaurantes"("id") ON DELETE RESTRICT,
  "entrega_id" INTEGER NOT NULL UNIQUE REFERENCES "entregas_epi"("id") ON DELETE RESTRICT,
  "termo_id" INTEGER NOT NULL REFERENCES "termos_responsabilidade"("id") ON DELETE RESTRICT,
  "funcionario_id" INTEGER NOT NULL REFERENCES "usuarios"("id") ON DELETE RESTRICT,
  "snapshot" JSONB NOT NULL,
  "hash_snapshot" TEXT NOT NULL,
  "hash_assinatura" TEXT NOT NULL,
  "hash_documento" TEXT NOT NULL,
  "hash_pdf" TEXT NOT NULL,
  "storage_key" TEXT NOT NULL,
  "aceito_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "aceites_termos_epi_restaurante_funcionario_idx" ON "aceites_termos_epi"("restaurante_id", "funcionario_id");
