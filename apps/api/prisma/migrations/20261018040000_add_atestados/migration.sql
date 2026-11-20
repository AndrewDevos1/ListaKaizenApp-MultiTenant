CREATE TYPE "SituacaoAtestado" AS ENUM ('ATIVO', 'CANCELADO');

CREATE TABLE "atestados" (
  "id" SERIAL NOT NULL,
  "usuario_id" INTEGER NOT NULL,
  "restaurante_id" INTEGER NOT NULL,
  "inicio" DATE NOT NULL,
  "fim" DATE NOT NULL,
  "motivo" VARCHAR(500) NOT NULL,
  "situacao" "SituacaoAtestado" NOT NULL DEFAULT 'ATIVO',
  "criado_por_id" INTEGER NOT NULL,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "atestados_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "atestados_periodo_check" CHECK ("inicio" <= "fim")
);

CREATE INDEX "atestados_restaurante_id_inicio_idx" ON "atestados"("restaurante_id", "inicio");
CREATE INDEX "atestados_usuario_id_inicio_idx" ON "atestados"("usuario_id", "inicio");

ALTER TABLE "atestados" ADD CONSTRAINT "atestados_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "atestados" ADD CONSTRAINT "atestados_restaurante_id_fkey" FOREIGN KEY ("restaurante_id") REFERENCES "restaurantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "atestados" ADD CONSTRAINT "atestados_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
