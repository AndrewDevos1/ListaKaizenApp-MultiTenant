ALTER TABLE "entregas_epi" ADD COLUMN "hash_criacao" TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE "entregas_epi" ALTER COLUMN "hash_criacao" DROP DEFAULT;
ALTER TABLE "entregas_epi" ADD COLUMN "hash_ultima_transicao" TEXT;
