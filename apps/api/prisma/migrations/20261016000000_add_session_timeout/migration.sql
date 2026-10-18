ALTER TABLE "restaurantes" ADD COLUMN "session_timeout_minutes" INTEGER;
ALTER TABLE "usuarios" ADD COLUMN "session_timeout_minutes" INTEGER;

ALTER TABLE "restaurantes"
  ADD CONSTRAINT "restaurantes_session_timeout_minutes_check"
  CHECK ("session_timeout_minutes" IS NULL OR "session_timeout_minutes" BETWEEN 5 AND 480);

ALTER TABLE "usuarios"
  ADD CONSTRAINT "usuarios_session_timeout_minutes_check"
  CHECK ("session_timeout_minutes" IS NULL OR "session_timeout_minutes" BETWEEN 5 AND 480);
