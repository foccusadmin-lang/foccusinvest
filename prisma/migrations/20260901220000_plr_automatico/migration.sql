
-- AlterTable
ALTER TABLE "ConfiguracaoSistema" ADD COLUMN     "modoPLR" "ModoProcessamento" NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "CampanhaPlrAutomatica" (
    "id" TEXT NOT NULL,
    "percentualTotal" DOUBLE PRECISION NOT NULL,
    "periodoInicio" TIMESTAMP(3) NOT NULL,
    "periodoFim" TIMESTAMP(3) NOT NULL,
    "horarioLancamento" TEXT NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadoPorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampanhaPlrAutomatica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampanhaPlrDia" (
    "id" TEXT NOT NULL,
    "campanhaId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "percentual" DOUBLE PRECISION NOT NULL,
    "processadoEm" TIMESTAMP(3),
    "distribuicaoId" TEXT,

    CONSTRAINT "CampanhaPlrDia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CampanhaPlrDia_distribuicaoId_key" ON "CampanhaPlrDia"("distribuicaoId");

-- CreateIndex
CREATE UNIQUE INDEX "CampanhaPlrDia_campanhaId_data_key" ON "CampanhaPlrDia"("campanhaId", "data");

-- AddForeignKey
ALTER TABLE "CampanhaPlrAutomatica" ADD CONSTRAINT "CampanhaPlrAutomatica_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampanhaPlrDia" ADD CONSTRAINT "CampanhaPlrDia_campanhaId_fkey" FOREIGN KEY ("campanhaId") REFERENCES "CampanhaPlrAutomatica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampanhaPlrDia" ADD CONSTRAINT "CampanhaPlrDia_distribuicaoId_fkey" FOREIGN KEY ("distribuicaoId") REFERENCES "DistribuicaoMensal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

