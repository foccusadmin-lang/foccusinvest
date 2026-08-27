-- Marketplace regional de serviços (Foccus Serviços) — Fase 1: papel do usuário no marketplace,
-- categorias/serviços administráveis, perfil de prestador, solicitações e avaliações.

-- CreateEnum
CREATE TYPE "PapelMarketplace" AS ENUM ('CLIENTE', 'PRESTADOR');

-- CreateEnum
CREATE TYPE "StatusSolicitacaoServico" AS ENUM ('PENDENTE', 'ACEITA', 'RECUSADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "papelMarketplace" "PapelMarketplace";

-- CreateTable
CREATE TABLE "CategoriaServico" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icone" TEXT,
    "descricao" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoriaServico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Servico" (
    "id" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerfilPrestador" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nomeProfissional" TEXT NOT NULL,
    "descricao" TEXT,
    "telefone" TEXT,
    "fotoUrl" TEXT,
    "cidade" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "bairro" TEXT,
    "endereco" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "raioAtendimentoKm" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "precoDe" DOUBLE PRECISION,
    "precoAte" DOUBLE PRECISION,
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerfilPrestador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrestadorServico" (
    "id" TEXT NOT NULL,
    "prestadorId" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrestadorServico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitacaoServico" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "prestadorId" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "descricao" TEXT,
    "endereco" TEXT,
    "bairro" TEXT,
    "cidade" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "status" "StatusSolicitacaoServico" NOT NULL DEFAULT 'PENDENTE',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolicitacaoServico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvaliacaoServico" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "prestadorId" TEXT NOT NULL,
    "solicitacaoId" TEXT NOT NULL,
    "nota" INTEGER NOT NULL,
    "comentario" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvaliacaoServico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoriaServico_slug_key" ON "CategoriaServico"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Servico_slug_key" ON "Servico"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PerfilPrestador_userId_key" ON "PerfilPrestador"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PrestadorServico_prestadorId_servicoId_key" ON "PrestadorServico"("prestadorId", "servicoId");

-- CreateIndex
CREATE UNIQUE INDEX "AvaliacaoServico_solicitacaoId_key" ON "AvaliacaoServico"("solicitacaoId");

-- AddForeignKey
ALTER TABLE "Servico" ADD CONSTRAINT "Servico_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaServico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerfilPrestador" ADD CONSTRAINT "PerfilPrestador_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestadorServico" ADD CONSTRAINT "PrestadorServico_prestadorId_fkey" FOREIGN KEY ("prestadorId") REFERENCES "PerfilPrestador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestadorServico" ADD CONSTRAINT "PrestadorServico_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoServico" ADD CONSTRAINT "SolicitacaoServico_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoServico" ADD CONSTRAINT "SolicitacaoServico_prestadorId_fkey" FOREIGN KEY ("prestadorId") REFERENCES "PerfilPrestador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoServico" ADD CONSTRAINT "SolicitacaoServico_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvaliacaoServico" ADD CONSTRAINT "AvaliacaoServico_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvaliacaoServico" ADD CONSTRAINT "AvaliacaoServico_prestadorId_fkey" FOREIGN KEY ("prestadorId") REFERENCES "PerfilPrestador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvaliacaoServico" ADD CONSTRAINT "AvaliacaoServico_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "SolicitacaoServico"("id") ON DELETE CASCADE ON UPDATE CASCADE;
