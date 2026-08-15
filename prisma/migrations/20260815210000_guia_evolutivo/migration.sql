-- CreateEnum
CREATE TYPE "PapelMensagemGuia" AS ENUM ('USER', 'MODEL');

-- CreateTable
CREATE TABLE "MensagemGuia" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "papel" "PapelMensagemGuia" NOT NULL,
    "texto" TEXT NOT NULL,
    "topico" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MensagemGuia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaqGuia" (
    "id" TEXT NOT NULL,
    "topico" TEXT NOT NULL,
    "pergunta" TEXT NOT NULL,
    "resposta" TEXT NOT NULL,
    "criadoPorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaqGuia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MensagemGuia_userId_criadoEm_idx" ON "MensagemGuia"("userId", "criadoEm");

-- CreateIndex
CREATE INDEX "MensagemGuia_topico_idx" ON "MensagemGuia"("topico");

-- AddForeignKey
ALTER TABLE "MensagemGuia" ADD CONSTRAINT "MensagemGuia_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaqGuia" ADD CONSTRAINT "FaqGuia_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
