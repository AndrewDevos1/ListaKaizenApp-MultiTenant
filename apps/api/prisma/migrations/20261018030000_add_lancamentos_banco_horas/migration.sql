CREATE TYPE "TipoLancamentoBancoHoras" AS ENUM ('AJUSTE_MANUAL', 'FOLGA_COMPENSATORIA', 'PAGAMENTO_HORAS', 'ATESTADO');
CREATE TABLE "lancamentos_banco_horas" (
  "id" SERIAL NOT NULL,
  "usuario_id" INTEGER NOT NULL,
  "restaurante_id" INTEGER NOT NULL,
  "tipo" "TipoLancamentoBancoHoras" NOT NULL,
  "minutos_delta" INTEGER NOT NULL,
  "data_referencia" DATE NOT NULL,
  "periodo_inicio" DATE,
  "periodo_fim" DATE,
  "motivo" TEXT NOT NULL,
  "criado_por_id" INTEGER NOT NULL,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lancamentos_banco_horas_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lancamentos_banco_horas_minutos_delta_check" CHECK ("minutos_delta" <> 0),
  CONSTRAINT "lancamentos_banco_horas_periodo_check" CHECK ("periodo_fim" IS NULL OR "periodo_inicio" IS NULL OR "periodo_inicio" <= "periodo_fim")
);
CREATE INDEX "lancamentos_banco_horas_usuario_id_data_referencia_idx" ON "lancamentos_banco_horas"("usuario_id", "data_referencia");
CREATE INDEX "lancamentos_banco_horas_restaurante_id_data_referencia_idx" ON "lancamentos_banco_horas"("restaurante_id", "data_referencia");
ALTER TABLE "lancamentos_banco_horas" ADD CONSTRAINT "lancamentos_banco_horas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lancamentos_banco_horas" ADD CONSTRAINT "lancamentos_banco_horas_restaurante_id_fkey" FOREIGN KEY ("restaurante_id") REFERENCES "restaurantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lancamentos_banco_horas" ADD CONSTRAINT "lancamentos_banco_horas_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
