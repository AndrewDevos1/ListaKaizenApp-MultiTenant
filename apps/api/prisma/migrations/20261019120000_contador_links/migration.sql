CREATE TYPE "ContadorPermissao" AS ENUM ('PONTO', 'DOCUMENTOS', 'EPI', 'ALMOXARIFADO');
ALTER TYPE "UserRole" ADD VALUE 'CONTADOR';

CREATE TABLE "contadores_restaurantes" (
  "id" SERIAL NOT NULL,
  "contador_id" INTEGER NOT NULL,
  "restaurante_id" INTEGER NOT NULL,
  "permissoes" "ContadorPermissao"[] NOT NULL DEFAULT ARRAY[]::"ContadorPermissao"[],
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contadores_restaurantes_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "contador_funcionarios" (
  "id" SERIAL NOT NULL,
  "contador_id" INTEGER NOT NULL,
  "restaurante_id" INTEGER NOT NULL,
  "funcionario_id" INTEGER NOT NULL,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contador_funcionarios_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "contadores_restaurantes_contador_id_restaurante_id_key" ON "contadores_restaurantes"("contador_id", "restaurante_id");
CREATE INDEX "contadores_restaurantes_restaurante_id_idx" ON "contadores_restaurantes"("restaurante_id");
CREATE UNIQUE INDEX "contador_funcionarios_contador_id_restaurante_id_funcionario_id_key" ON "contador_funcionarios"("contador_id", "restaurante_id", "funcionario_id");
CREATE INDEX "contador_funcionarios_contador_id_restaurante_id_idx" ON "contador_funcionarios"("contador_id", "restaurante_id");
CREATE INDEX "contador_funcionarios_funcionario_id_restaurante_id_idx" ON "contador_funcionarios"("funcionario_id", "restaurante_id");
ALTER TABLE "contadores_restaurantes" ADD CONSTRAINT "contadores_restaurantes_contador_id_fkey" FOREIGN KEY ("contador_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contadores_restaurantes" ADD CONSTRAINT "contadores_restaurantes_restaurante_id_fkey" FOREIGN KEY ("restaurante_id") REFERENCES "restaurantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contador_funcionarios" ADD CONSTRAINT "contador_funcionarios_contador_id_fkey" FOREIGN KEY ("contador_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contador_funcionarios" ADD CONSTRAINT "contador_funcionarios_restaurante_id_fkey" FOREIGN KEY ("restaurante_id") REFERENCES "restaurantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contador_funcionarios" ADD CONSTRAINT "contador_funcionarios_funcionario_id_fkey" FOREIGN KEY ("funcionario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
