ALTER TABLE "atestados" ADD COLUMN "solicitacao_hash" VARCHAR(64);

UPDATE "atestados"
SET "solicitacao_hash" = md5(concat(
  "restaurante_id", '|', "usuario_id", '|', to_char("inicio", 'YYYY-MM-DD'), '|',
  to_char("fim", 'YYYY-MM-DD'), '|', coalesce("hora_inicio", ''), '|',
  coalesce("hora_fim", ''), '|', btrim("motivo", E' \t\n\r\f\v')
))
WHERE "solicitacao_hash" IS NULL;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "atestados" GROUP BY "solicitacao_hash" HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'existing duplicate atestados require manual review before idempotency constraint';
  END IF;
END $$;

ALTER TABLE "atestados"
  ALTER COLUMN "solicitacao_hash" SET NOT NULL,
  ADD CONSTRAINT "atestados_solicitacao_hash_key" UNIQUE ("solicitacao_hash");
