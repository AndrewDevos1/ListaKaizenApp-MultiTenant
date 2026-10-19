ALTER TYPE "SituacaoAtestado" ADD VALUE IF NOT EXISTS 'PENDENTE';
ALTER TYPE "SituacaoAtestado" ADD VALUE IF NOT EXISTS 'APROVADO';
ALTER TYPE "SituacaoAtestado" ADD VALUE IF NOT EXISTS 'REJEITADO';

ALTER TABLE "atestados"
  ADD COLUMN "hora_inicio" VARCHAR(5),
  ADD COLUMN "hora_fim" VARCHAR(5),
  ADD COLUMN "decidido_por_id" INTEGER,
  ADD COLUMN "decidido_em" TIMESTAMP(3),
  ADD COLUMN "observacao_decisao" VARCHAR(500);

ALTER TABLE "atestados"
  ADD CONSTRAINT "atestados_decidido_por_id_fkey"
  FOREIGN KEY ("decidido_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "atestados"
  ADD CONSTRAINT "atestados_horas_check"
  CHECK (("hora_inicio" IS NULL AND "hora_fim" IS NULL) OR ("hora_inicio" IS NOT NULL AND "hora_fim" IS NOT NULL AND "hora_inicio" < "hora_fim"));
