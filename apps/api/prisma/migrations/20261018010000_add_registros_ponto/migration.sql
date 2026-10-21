CREATE TYPE "TipoPonto" AS ENUM ('ENTRADA', 'PAUSA', 'RETORNO', 'SAIDA');

CREATE TABLE "registros_ponto" (
  "id" SERIAL NOT NULL,
  "usuario_id" INTEGER NOT NULL,
  "restaurante_id" INTEGER NOT NULL,
  "tipo" "TipoPonto" NOT NULL,
  "registrado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "data_operacional" DATE NOT NULL,
  "observacoes" TEXT,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "registros_ponto_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "registros_ponto_restaurante_id_registrado_em_idx"
  ON "registros_ponto"("restaurante_id", "registrado_em");
CREATE INDEX "registros_ponto_usuario_id_registrado_em_idx"
  ON "registros_ponto"("usuario_id", "registrado_em");
CREATE INDEX "registros_ponto_restaurante_id_data_operacional_idx"
  ON "registros_ponto"("restaurante_id", "data_operacional");
CREATE INDEX "registros_ponto_usuario_id_data_operacional_idx"
  ON "registros_ponto"("usuario_id", "data_operacional");

ALTER TABLE "registros_ponto"
  ADD CONSTRAINT "registros_ponto_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "registros_ponto"
  ADD CONSTRAINT "registros_ponto_restaurante_id_fkey"
  FOREIGN KEY ("restaurante_id") REFERENCES "restaurantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
