-- CreateEnum
CREATE TYPE "CategoriaBem" AS ENUM ('IMOVEL', 'AUTOMOVEL', 'ELETRONICO');

-- AlterTable
ALTER TABLE "Aplicacao" ADD COLUMN "categoriaBem" "CategoriaBem",
ADD COLUMN "descricaoBem" TEXT,
ADD COLUMN "valorDeclarado" DOUBLE PRECISION,
ADD COLUMN "dataAgendamento" TIMESTAMP(3);
