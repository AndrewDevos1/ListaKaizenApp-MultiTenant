-- #50 é dona do snapshot da entrega/termo. #51 só cria compatibilidade isolada e propaga para custódia.
ALTER TABLE "entregas_epi_itens" ADD COLUMN IF NOT EXISTS "valor_referencia_snapshot" DECIMAL(14,2);
UPDATE "entregas_epi_itens" item
SET "valor_referencia_snapshot" = material."valor_referencia"
FROM "materiais_almoxarifado" material
WHERE material."id" = item."material_id"
  AND item."valor_referencia_snapshot" IS NULL;
ALTER TABLE "entregas_epi_itens" ALTER COLUMN "valor_referencia_snapshot" SET NOT NULL;

ALTER TABLE "custodias_epi_itens" ADD COLUMN "valor_referencia_snapshot" DECIMAL(14,2);
UPDATE "custodias_epi_itens" custodia
SET "valor_referencia_snapshot" = item."valor_referencia_snapshot"
FROM "entregas_epi_itens" item
WHERE item."id" = custodia."entrega_item_id"
  AND custodia."valor_referencia_snapshot" IS NULL;
ALTER TABLE "custodias_epi_itens" ALTER COLUMN "valor_referencia_snapshot" SET NOT NULL;
