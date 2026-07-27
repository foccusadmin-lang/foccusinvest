-- CreateEnum
CREATE TYPE "StatusMigracao" AS ENUM ('PENDENTE', 'APLICADA', 'CANCELADA');

-- AlterEnum
ALTER TYPE "OrigemAplicacao" ADD VALUE 'MIGRACAO';

-- CreateTable
CREATE TABLE "MigracaoSaldo" (
    "id" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "nomeReferencia" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "observacao" TEXT,
    "status" "StatusMigracao" NOT NULL DEFAULT 'PENDENTE',
    "userId" TEXT,
    "aplicacaoId" TEXT,
    "criadoPorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aplicadoEm" TIMESTAMP(3),

    CONSTRAINT "MigracaoSaldo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MigracaoSaldo_documento_key" ON "MigracaoSaldo"("documento");

-- AddForeignKey
ALTER TABLE "MigracaoSaldo" ADD CONSTRAINT "MigracaoSaldo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MigracaoSaldo" ADD CONSTRAINT "MigracaoSaldo_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
