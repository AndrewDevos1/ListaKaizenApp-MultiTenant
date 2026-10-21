CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE "escalas_trabalho" (
  "id" SERIAL NOT NULL,
  "usuario_id" INTEGER NOT NULL,
  "restaurante_id" INTEGER NOT NULL,
  "nome" VARCHAR(120) NOT NULL,
  "vigencia_inicio" DATE NOT NULL,
  "vigencia_fim" DATE,
  "criado_por_id" INTEGER NOT NULL,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "escalas_trabalho_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "escalas_trabalho_vigencia_check" CHECK ("vigencia_fim" IS NULL OR "vigencia_fim" >= "vigencia_inicio")
);

CREATE TABLE "dias_escala_trabalho" (
  "id" SERIAL NOT NULL,
  "escala_id" INTEGER NOT NULL,
  "dia_semana" INTEGER NOT NULL,
  "trabalha" BOOLEAN NOT NULL DEFAULT false,
  "entrada_prevista" VARCHAR(5),
  "saida_prevista" VARCHAR(5),
  "tolerancia_minutos" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "dias_escala_trabalho_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "dias_escala_trabalho_dia_semana_check" CHECK ("dia_semana" BETWEEN 0 AND 6),
  CONSTRAINT "dias_escala_trabalho_tolerancia_check" CHECK ("tolerancia_minutos" >= 0),
  CONSTRAINT "dias_escala_trabalho_horarios_check" CHECK ((NOT "trabalha" AND "entrada_prevista" IS NULL AND "saida_prevista" IS NULL) OR ("trabalha" AND "entrada_prevista" IS NOT NULL AND "saida_prevista" IS NOT NULL AND "entrada_prevista" < "saida_prevista"))
);

CREATE INDEX "escalas_trabalho_restaurante_id_usuario_id_vigencia_inicio_idx" ON "escalas_trabalho"("restaurante_id", "usuario_id", "vigencia_inicio");
ALTER TABLE "escalas_trabalho" ADD CONSTRAINT "escalas_trabalho_sem_sobreposicao" EXCLUDE USING gist (
  "restaurante_id" WITH =,
  "usuario_id" WITH =,
  daterange("vigencia_inicio", COALESCE("vigencia_fim", 'infinity'::date), '[]') WITH &&
);
CREATE UNIQUE INDEX "dias_escala_trabalho_escala_id_dia_semana_key" ON "dias_escala_trabalho"("escala_id", "dia_semana");
ALTER TABLE "escalas_trabalho" ADD CONSTRAINT "escalas_trabalho_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "escalas_trabalho" ADD CONSTRAINT "escalas_trabalho_restaurante_id_fkey" FOREIGN KEY ("restaurante_id") REFERENCES "restaurantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "escalas_trabalho" ADD CONSTRAINT "escalas_trabalho_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dias_escala_trabalho" ADD CONSTRAINT "dias_escala_trabalho_escala_id_fkey" FOREIGN KEY ("escala_id") REFERENCES "escalas_trabalho"("id") ON DELETE CASCADE ON UPDATE CASCADE;
