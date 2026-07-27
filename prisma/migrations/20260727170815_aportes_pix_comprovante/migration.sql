-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StatusAplicacao" ADD VALUE 'AGUARDANDO_APROVACAO';
ALTER TYPE "StatusAplicacao" ADD VALUE 'REJEITADA';

-- AlterTable
ALTER TABLE "Aplicacao" ADD COLUMN     "aprovadoEm" TIMESTAMP(3),
ADD COLUMN     "aprovadoPorId" TEXT,
ADD COLUMN     "comprovante" BYTEA,
ADD COLUMN     "comprovanteNome" TEXT,
ADD COLUMN     "comprovanteTipo" TEXT,
ADD COLUMN     "motivoRejeicao" TEXT;

-- AddForeignKey
ALTER TABLE "Aplicacao" ADD CONSTRAINT "Aplicacao_aprovadoPorId_fkey" FOREIGN KEY ("aprovadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
