
-- CreateTable
CREATE TABLE "LiberacaoIncentivoDiaria" (
    "id" TEXT NOT NULL,
    "dia" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiberacaoIncentivoDiaria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LiberacaoIncentivoDiaria_dia_key" ON "LiberacaoIncentivoDiaria"("dia");

