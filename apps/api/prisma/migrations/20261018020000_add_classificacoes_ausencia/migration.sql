CREATE TYPE "TipoClassificacaoAusencia" AS ENUM ('FALTA', 'FOLGA');

ALTER TYPE "TipoNotificacao" ADD VALUE 'CLASSIFICACAO_FALTA';

CREATE TABLE "classificacoes_ausencia" (
  "id" SERIAL NOT NULL,
  "usuario_id" INTEGER NOT NULL,
  "restaurante_id" INTEGER NOT NULL,
  "data" DATE NOT NULL,
  "tipo" "TipoClassificacaoAusencia" NOT NULL,
  "motivo" TEXT,
  "classificado_por_id" INTEGER NOT NULL,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "classificacoes_ausencia_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "classificacoes_ausencia_usuario_id_restaurante_id_data_key"
  ON "classificacoes_ausencia"("usuario_id", "restaurante_id", "data");
CREATE INDEX "classificacoes_ausencia_restaurante_id_data_idx"
  ON "classificacoes_ausencia"("restaurante_id", "data");

ALTER TABLE "classificacoes_ausencia"
  ADD CONSTRAINT "classificacoes_ausencia_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "classificacoes_ausencia"
  ADD CONSTRAINT "classificacoes_ausencia_restaurante_id_fkey"
  FOREIGN KEY ("restaurante_id") REFERENCES "restaurantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "classificacoes_ausencia"
  ADD CONSTRAINT "classificacoes_ausencia_classificado_por_id_fkey"
  FOREIGN KEY ("classificado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
