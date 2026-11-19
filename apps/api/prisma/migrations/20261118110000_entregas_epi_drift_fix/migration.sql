-- Alinha FKs geradas manualmente com o comportamento padrão do Prisma e remove índice não declarado.
ALTER TABLE "entregas_epi" DROP CONSTRAINT IF EXISTS "entregas_epi_criado_por_id_fkey";
ALTER TABLE "entregas_epi" DROP CONSTRAINT IF EXISTS "entregas_epi_funcionario_id_fkey";
ALTER TABLE "entregas_epi" DROP CONSTRAINT IF EXISTS "entregas_epi_restaurante_id_fkey";
ALTER TABLE "entregas_epi_itens" DROP CONSTRAINT IF EXISTS "entregas_epi_itens_entrega_id_fkey";
ALTER TABLE "entregas_epi_itens" DROP CONSTRAINT IF EXISTS "entregas_epi_itens_material_id_fkey";
ALTER TABLE "entregas_epi_itens" DROP CONSTRAINT IF EXISTS "entregas_epi_itens_posicao_id_fkey";
ALTER TABLE "entregas_epi_itens" DROP CONSTRAINT IF EXISTS "entregas_epi_itens_variante_id_fkey";
ALTER TABLE "materiais_almoxarifado" DROP CONSTRAINT IF EXISTS "materiais_almoxarifado_restaurante_id_fkey";
ALTER TABLE "movimentos_material_almoxarifado" DROP CONSTRAINT IF EXISTS "movimentos_material_almoxarifado_material_id_fkey";
ALTER TABLE "movimentos_material_almoxarifado" DROP CONSTRAINT IF EXISTS "movimentos_material_almoxarifado_posicao_id_fkey";
ALTER TABLE "movimentos_material_almoxarifado" DROP CONSTRAINT IF EXISTS "movimentos_material_almoxarifado_restaurante_id_fkey";
ALTER TABLE "movimentos_material_almoxarifado" DROP CONSTRAINT IF EXISTS "movimentos_material_almoxarifado_variante_id_fkey";
ALTER TABLE "posicoes_material_almoxarifado" DROP CONSTRAINT IF EXISTS "posicoes_material_almoxarifado_material_id_fkey";
ALTER TABLE "posicoes_material_almoxarifado" DROP CONSTRAINT IF EXISTS "posicoes_material_almoxarifado_restaurante_id_fkey";
ALTER TABLE "posicoes_material_almoxarifado" DROP CONSTRAINT IF EXISTS "posicoes_material_almoxarifado_variante_id_fkey";
ALTER TABLE "variantes_material_almoxarifado" DROP CONSTRAINT IF EXISTS "variantes_material_almoxarifado_material_id_fkey";
DROP INDEX IF EXISTS "entregas_epi_funcionario_status";

ALTER TABLE "materiais_almoxarifado" ADD CONSTRAINT "materiais_almoxarifado_restaurante_id_fkey" FOREIGN KEY ("restaurante_id") REFERENCES "restaurantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "variantes_material_almoxarifado" ADD CONSTRAINT "variantes_material_almoxarifado_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materiais_almoxarifado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "posicoes_material_almoxarifado" ADD CONSTRAINT "posicoes_material_almoxarifado_restaurante_id_fkey" FOREIGN KEY ("restaurante_id") REFERENCES "restaurantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "posicoes_material_almoxarifado" ADD CONSTRAINT "posicoes_material_almoxarifado_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materiais_almoxarifado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "posicoes_material_almoxarifado" ADD CONSTRAINT "posicoes_material_almoxarifado_variante_id_fkey" FOREIGN KEY ("variante_id") REFERENCES "variantes_material_almoxarifado"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "entregas_epi" ADD CONSTRAINT "entregas_epi_restaurante_id_fkey" FOREIGN KEY ("restaurante_id") REFERENCES "restaurantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "entregas_epi" ADD CONSTRAINT "entregas_epi_funcionario_id_fkey" FOREIGN KEY ("funcionario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "entregas_epi" ADD CONSTRAINT "entregas_epi_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "entregas_epi_itens" ADD CONSTRAINT "entregas_epi_itens_entrega_id_fkey" FOREIGN KEY ("entrega_id") REFERENCES "entregas_epi"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "movimentos_material_almoxarifado" ADD CONSTRAINT "movimentos_material_almoxarifado_restaurante_id_fkey" FOREIGN KEY ("restaurante_id") REFERENCES "restaurantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "movimentos_material_almoxarifado" ADD CONSTRAINT "movimentos_material_almoxarifado_posicao_id_fkey" FOREIGN KEY ("posicao_id") REFERENCES "posicoes_material_almoxarifado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "movimentos_material_almoxarifado" ADD CONSTRAINT "movimentos_material_almoxarifado_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materiais_almoxarifado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "movimentos_material_almoxarifado" ADD CONSTRAINT "movimentos_material_almoxarifado_variante_id_fkey" FOREIGN KEY ("variante_id") REFERENCES "variantes_material_almoxarifado"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "entregas_epi_itens" ADD CONSTRAINT "entregas_epi_itens_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materiais_almoxarifado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "entregas_epi_itens" ADD CONSTRAINT "entregas_epi_itens_posicao_id_fkey" FOREIGN KEY ("posicao_id") REFERENCES "posicoes_material_almoxarifado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "entregas_epi_itens" ADD CONSTRAINT "entregas_epi_itens_variante_id_fkey" FOREIGN KEY ("variante_id") REFERENCES "variantes_material_almoxarifado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER INDEX "movimentos_material_almoxarif_restaurante_id_chave_idempote_key" RENAME TO "movimentos_material_almoxarifado_restaurante_id_chave_idemp_key";
ALTER INDEX "movimentos_material_almoxarifado_posicao_criado" RENAME TO "movimentos_material_almoxarifado_posicao_id_criado_em_idx";
ALTER INDEX "posicoes_material_almoxarifado_restaurante_id_material_id_varia" RENAME TO "posicoes_material_almoxarifado_restaurante_id_material_id_v_key";
