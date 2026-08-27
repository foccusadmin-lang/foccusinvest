-- Sistema de regiões e bairros ("Parte 2") — bairros deixam de ser texto livre e passam a vir
-- do banco (tabela Regiao), com relação N:N prestador↔bairros atendidos e sugestões de bairro
-- pendentes de aprovação do admin.

-- CreateEnum
CREATE TYPE "StatusSugestaoRegiao" AS ENUM ('PENDENTE', 'APROVADA', 'REJEITADA');

-- CreateTable
CREATE TABLE "Regiao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "pais" TEXT NOT NULL DEFAULT 'BR',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Regiao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrestadorRegiao" (
    "id" TEXT NOT NULL,
    "prestadorId" TEXT NOT NULL,
    "regiaoId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrestadorRegiao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SugestaoRegiao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "enviadoPorId" TEXT NOT NULL,
    "status" "StatusSugestaoRegiao" NOT NULL DEFAULT 'PENDENTE',
    "revisadoPorId" TEXT,
    "revisadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SugestaoRegiao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Regiao_cidade_slug_key" ON "Regiao"("cidade", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "PrestadorRegiao_prestadorId_regiaoId_key" ON "PrestadorRegiao"("prestadorId", "regiaoId");

-- AlterTable
ALTER TABLE "PerfilPrestador" DROP COLUMN "bairro",
ADD COLUMN     "regiaoPrincipalId" TEXT;

-- AddForeignKey
ALTER TABLE "PerfilPrestador" ADD CONSTRAINT "PerfilPrestador_regiaoPrincipalId_fkey" FOREIGN KEY ("regiaoPrincipalId") REFERENCES "Regiao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestadorRegiao" ADD CONSTRAINT "PrestadorRegiao_prestadorId_fkey" FOREIGN KEY ("prestadorId") REFERENCES "PerfilPrestador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestadorRegiao" ADD CONSTRAINT "PrestadorRegiao_regiaoId_fkey" FOREIGN KEY ("regiaoId") REFERENCES "Regiao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SugestaoRegiao" ADD CONSTRAINT "SugestaoRegiao_enviadoPorId_fkey" FOREIGN KEY ("enviadoPorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SugestaoRegiao" ADD CONSTRAINT "SugestaoRegiao_revisadoPorId_fkey" FOREIGN KEY ("revisadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- SolicitacaoServico ainda não tem nenhuma linha em produção neste branch (a criação de
-- solicitação pelo cliente ainda não tem UI — ver Fase 1), então dá pra trocar o "bairro" livre
-- por "regiaoId" obrigatório direto, sem precisar de coluna opcional + backfill.

-- AlterTable
ALTER TABLE "SolicitacaoServico" DROP COLUMN "bairro",
ADD COLUMN     "regiaoId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "SolicitacaoServico" ADD CONSTRAINT "SolicitacaoServico_regiaoId_fkey" FOREIGN KEY ("regiaoId") REFERENCES "Regiao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
