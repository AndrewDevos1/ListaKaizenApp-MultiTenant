ALTER TABLE "restaurantes"
  ADD COLUMN "modulo_ponto" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "modulo_funcionarios" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "modulo_almoxarifado_epi" BOOLEAN NOT NULL DEFAULT true;
