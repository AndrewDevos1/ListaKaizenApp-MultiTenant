-- Alinha constraints/índices ao schema.prisma (drift detectado por migrate diff em banco novo).
ALTER TABLE "atestados" DROP CONSTRAINT IF EXISTS "atestados_decidido_por_id_fkey";
ALTER TABLE "atestados" ADD CONSTRAINT "atestados_decidido_por_id_fkey" FOREIGN KEY ("decidido_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER INDEX IF EXISTS "contador_funcionarios_contador_id_restaurante_id_funcionario_id" RENAME TO "contador_funcionarios_contador_id_restaurante_id_funcionari_key";
