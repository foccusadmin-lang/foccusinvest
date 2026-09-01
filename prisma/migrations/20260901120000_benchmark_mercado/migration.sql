
-- CreateEnum
CREATE TYPE "IndicadorMercado" AS ENUM ('CDI', 'CDB', 'IPCA', 'IBOVESPA');

-- CreateTable
CREATE TABLE "BenchmarkMercado" (
    "id" TEXT NOT NULL,
    "indicador" "IndicadorMercado" NOT NULL,
    "mes" TIMESTAMP(3) NOT NULL,
    "valorPercentual" DOUBLE PRECISION NOT NULL,
    "criadoPorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BenchmarkMercado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BenchmarkMercado_indicador_mes_key" ON "BenchmarkMercado"("indicador", "mes");

-- AddForeignKey
ALTER TABLE "BenchmarkMercado" ADD CONSTRAINT "BenchmarkMercado_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

