-- CreateTable
CREATE TABLE "EstrategiaOperacao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL DEFAULT 'Estratégia WEM',
    "moedas" TEXT NOT NULL DEFAULT 'USD, EUR, XAU (Ouro)',
    "esperadoMin" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "esperadoMax" DOUBLE PRECISION NOT NULL DEFAULT 4.0,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstrategiaOperacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PontoEstrategia" (
    "id" TEXT NOT NULL,
    "estrategiaId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "variacaoDia" DOUBLE PRECISION NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PontoEstrategia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PontoEstrategia_estrategiaId_data_key" ON "PontoEstrategia"("estrategiaId", "data");

-- CreateIndex
CREATE INDEX "PontoEstrategia_estrategiaId_data_idx" ON "PontoEstrategia"("estrategiaId", "data");

-- AddForeignKey
ALTER TABLE "PontoEstrategia" ADD CONSTRAINT "PontoEstrategia_estrategiaId_fkey" FOREIGN KEY ("estrategiaId") REFERENCES "EstrategiaOperacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
