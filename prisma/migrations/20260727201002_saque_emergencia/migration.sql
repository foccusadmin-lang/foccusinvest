-- AlterEnum
ALTER TYPE "TipoSaque" ADD VALUE 'BONUS';

-- AlterTable
ALTER TABLE "SolicitacaoSaque" ADD COLUMN     "emergencial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "motivoEmergencia" TEXT,
ADD COLUMN     "taxaAntecipacao" DOUBLE PRECISION,
ADD COLUMN     "valorBruto" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "saqueEmergencialLiberado" BOOLEAN NOT NULL DEFAULT false;
