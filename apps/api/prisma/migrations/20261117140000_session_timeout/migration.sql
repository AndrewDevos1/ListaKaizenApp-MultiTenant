-- Issue #7: timeout de sessao persistido (usuario > restaurante > 30).
ALTER TABLE "restaurantes" ADD COLUMN "session_timeout_minutos" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "restaurantes" ADD CONSTRAINT "restaurantes_session_timeout_minutos_check" CHECK ("session_timeout_minutos" BETWEEN 5 AND 480);
ALTER TABLE "usuarios" ADD COLUMN "session_timeout_minutos" INTEGER;
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_session_timeout_minutos_check" CHECK ("session_timeout_minutos" IS NULL OR "session_timeout_minutos" BETWEEN 5 AND 480);
