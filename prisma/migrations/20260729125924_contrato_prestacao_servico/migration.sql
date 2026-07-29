-- AlterTable
ALTER TABLE "PessoaFisica" ADD COLUMN     "estadoCivil" TEXT,
ADD COLUMN     "nacionalidade" TEXT,
ADD COLUMN     "profissao" TEXT,
ADD COLUMN     "rg" TEXT;

-- AlterTable
ALTER TABLE "PessoaJuridica" ADD COLUMN     "estadoCivilRepresentante" TEXT,
ADD COLUMN     "nacionalidadeRepresentante" TEXT,
ADD COLUMN     "profissaoRepresentante" TEXT,
ADD COLUMN     "rgRepresentante" TEXT;

-- CreateTable
CREATE TABLE "Contrato" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "aplicacaoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "rg" TEXT,
    "nacionalidade" TEXT,
    "estadoCivil" TEXT,
    "profissao" TEXT,
    "telefone" TEXT,
    "endereco" TEXT,
    "valor" DOUBLE PRECISION NOT NULL,
    "valorExtenso" TEXT NOT NULL,
    "confirmouLeituraEm" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contrato_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contrato_aplicacaoId_key" ON "Contrato"("aplicacaoId");

-- AddForeignKey
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_aplicacaoId_fkey" FOREIGN KEY ("aplicacaoId") REFERENCES "Aplicacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
