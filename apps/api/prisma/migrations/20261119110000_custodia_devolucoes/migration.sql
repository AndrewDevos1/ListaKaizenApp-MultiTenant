-- Aditiva. Devolução reduz custódia; somente REUTILIZAVEL recompõe saldo por serviço transacional.
ALTER TYPE "TipoEventoEntregaEpi" ADD VALUE 'DEVOLUCAO';
ALTER TYPE "TipoEventoEntregaEpi" ADD VALUE 'OCORRENCIA_PERDA_DANO';
ALTER TYPE "TipoEventoEntregaEpi" ADD VALUE 'BAIXA_ADMINISTRATIVA';
CREATE TYPE "CondicaoDevolucaoEpi" AS ENUM ('REUTILIZAVEL','DANIFICADO','INUTILIZADO','OUTRA');
CREATE TYPE "TipoOcorrenciaEpi" AS ENUM ('PERDA','DANO');
CREATE TABLE "devolucoes_epi" (
  "id" SERIAL PRIMARY KEY, "restaurante_id" INTEGER NOT NULL, "custodia_id" INTEGER NOT NULL,
  "entrega_id" INTEGER NOT NULL, "quantidade" DECIMAL(14,3) NOT NULL CHECK ("quantidade" > 0),
  "condicao" "CondicaoDevolucaoEpi" NOT NULL, "observacao" TEXT, "chave_idempotencia" TEXT NOT NULL,
  "hash_payload" TEXT NOT NULL, "criado_por_id" INTEGER NOT NULL, "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("restaurante_id", "chave_idempotencia"),
  CONSTRAINT "devolucoes_epi_restaurante_id_fkey" FOREIGN KEY ("restaurante_id") REFERENCES "restaurantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "devolucoes_epi_custodia_id_fkey" FOREIGN KEY ("custodia_id") REFERENCES "custodias_epi_itens"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "devolucoes_epi_entrega_id_fkey" FOREIGN KEY ("entrega_id") REFERENCES "entregas_epi"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "devolucoes_epi_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "ocorrencias_epi" (
  "id" SERIAL PRIMARY KEY, "restaurante_id" INTEGER NOT NULL, "custodia_id" INTEGER NOT NULL,
  "entrega_id" INTEGER NOT NULL, "tipo" "TipoOcorrenciaEpi" NOT NULL, "quantidade" DECIMAL(14,3) NOT NULL CHECK ("quantidade" > 0),
  "descricao" TEXT NOT NULL, "custo_referencia" DECIMAL(14,2), "avaliado_em" TIMESTAMP(3),
  "criado_por_id" INTEGER NOT NULL, "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ocorrencias_epi_restaurante_id_fkey" FOREIGN KEY ("restaurante_id") REFERENCES "restaurantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ocorrencias_epi_custodia_id_fkey" FOREIGN KEY ("custodia_id") REFERENCES "custodias_epi_itens"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ocorrencias_epi_entrega_id_fkey" FOREIGN KEY ("entrega_id") REFERENCES "entregas_epi"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ocorrencias_epi_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE FUNCTION bloquear_mutacao_devolucao_epi() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'devolucoes_epi é append-only'; END; $$;
CREATE TRIGGER devolucoes_epi_append_only BEFORE UPDATE OR DELETE ON "devolucoes_epi" FOR EACH ROW EXECUTE FUNCTION bloquear_mutacao_devolucao_epi();
