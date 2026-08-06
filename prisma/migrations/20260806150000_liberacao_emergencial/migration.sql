
-- CreateEnum
CREATE TYPE "TipoLiberacaoEmergencial" AS ENUM ('TOTAL', 'PARCIAL');

-- CreateEnum
CREATE TYPE "StatusLiberacaoEmergencial" AS ENUM ('ATIVA', 'UTILIZADA', 'EXPIRADA', 'CANCELADA');

-- AlterTable
ALTER TABLE "SolicitacaoSaque" ADD COLUMN     "solicitacaoSaqueRendimentoId" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "saqueEmergencialLiberado";

-- CreateTable
CREATE TABLE "LiberacaoEmergencial" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "aplicacaoId" TEXT NOT NULL,
    "valorMaximo" DOUBLE PRECISION NOT NULL,
    "tipoSaque" "TipoLiberacaoEmergencial" NOT NULL,
    "motivo" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "status" "StatusLiberacaoEmergencial" NOT NULL DEFAULT 'ATIVA',
    "criadoPorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "canceladoPorId" TEXT,
    "canceladoEm" TIMESTAMP(3),
    "solicitacaoSaqueId" TEXT,

    CONSTRAINT "LiberacaoEmergencial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LiberacaoEmergencial_solicitacaoSaqueId_key" ON "LiberacaoEmergencial"("solicitacaoSaqueId");

-- AddForeignKey
ALTER TABLE "LiberacaoEmergencial" ADD CONSTRAINT "LiberacaoEmergencial_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiberacaoEmergencial" ADD CONSTRAINT "LiberacaoEmergencial_aplicacaoId_fkey" FOREIGN KEY ("aplicacaoId") REFERENCES "Aplicacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiberacaoEmergencial" ADD CONSTRAINT "LiberacaoEmergencial_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiberacaoEmergencial" ADD CONSTRAINT "LiberacaoEmergencial_canceladoPorId_fkey" FOREIGN KEY ("canceladoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiberacaoEmergencial" ADD CONSTRAINT "LiberacaoEmergencial_solicitacaoSaqueId_fkey" FOREIGN KEY ("solicitacaoSaqueId") REFERENCES "SolicitacaoSaque"("id") ON DELETE SET NULL ON UPDATE CASCADE;

