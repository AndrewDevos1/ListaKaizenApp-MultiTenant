-- Jornada noturna (ex.: 18:00-02:00) cruza a meia-noite: saida < entrada e valida.
-- Mantem a exigencia de horarios preenchidos e diferentes quando trabalha.
ALTER TABLE "dias_escala_trabalho" DROP CONSTRAINT "dias_escala_trabalho_horarios_check";
ALTER TABLE "dias_escala_trabalho" ADD CONSTRAINT "dias_escala_trabalho_horarios_check" CHECK (
  (NOT "trabalha" AND "entrada_prevista" IS NULL AND "saida_prevista" IS NULL)
  OR ("trabalha" AND "entrada_prevista" IS NOT NULL AND "saida_prevista" IS NOT NULL AND "entrada_prevista" <> "saida_prevista")
);
