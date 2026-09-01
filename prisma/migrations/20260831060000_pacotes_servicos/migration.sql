
-- CreateEnum
CREATE TYPE "CodigoServico" AS ENUM ('TRANSFERENCIA_USUARIOS', 'REAPLICACAO_AUTOMATICA', 'ASSESSORIA_CONTABIL', 'ASSESSORIA_JURIDICA', 'ASSESSORIA_TI', 'APLICACAO_BENS', 'DOAR_ENTIDADE', 'PLANO_LIDERANCA', 'SAQUE_EMERGENCIA');

-- CreateEnum
CREATE TYPE "StatusServicoUsuario" AS ENUM ('DISPONIVEL', 'SELECIONADO', 'AGUARDANDO_CONFIRMACAO', 'PAGAMENTO_PENDENTE', 'CONTRATADO', 'CONTRATADO_AGUARDANDO_ELEGIBILIDADE', 'ATIVO', 'INATIVO', 'DESATIVACAO_AGENDADA', 'BLOQUEADO', 'SUSPENSO', 'CANCELADO', 'PAGAMENTO_RECUSADO', 'ERRO_PAGAMENTO');

-- CreateEnum
CREATE TYPE "FormaContratacaoServico" AS ENUM ('INDIVIDUAL', 'PACOTE_MENSAL', 'PACOTE_ANUAL');

-- CreateEnum
CREATE TYPE "StatusCobrancaServico" AS ENUM ('PENDENTE', 'CONFIRMADA', 'RECUSADA', 'CANCELADA', 'ESTORNADA', 'DUPLICADA', 'ERRO');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrigemAplicacao" ADD VALUE 'TRANSFERENCIA_ENTRE_USUARIOS';
ALTER TYPE "OrigemAplicacao" ADD VALUE 'PAGAMENTO_SERVICO';

-- AlterEnum
ALTER TYPE "PerfilUsuario" ADD VALUE 'EMPRESA';

-- CreateTable
CREATE TABLE "ServicoPacote" (
    "id" TEXT NOT NULL,
    "codigo" "CodigoServico" NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "tarifa" DOUBLE PRECISION NOT NULL,
    "icone" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "integraPacote" BOOLEAN NOT NULL DEFAULT true,
    "ativoGlobal" BOOLEAN NOT NULL DEFAULT true,
    "contatoWhatsapp" TEXT,
    "mensagemPadrao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServicoPacote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContratoServico" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "status" "StatusServicoUsuario" NOT NULL DEFAULT 'INATIVO',
    "formaContratacao" "FormaContratacaoServico",
    "contratadoEm" TIMESTAMP(3),
    "ativadoEm" TIMESTAMP(3),
    "desativadoEm" TIMESTAMP(3),
    "vigenciaFim" TIMESTAMP(3),
    "liberacaoExcepcional" BOOLEAN NOT NULL DEFAULT false,
    "liberadoPorId" TEXT,
    "motivoLiberacao" TEXT,
    "liberadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContratoServico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CobrancaServico" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "servicosCodigos" TEXT NOT NULL,
    "formaContratacao" "FormaContratacaoServico" NOT NULL,
    "valorBruto" DOUBLE PRECISION NOT NULL,
    "percentualDesconto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorDesconto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorFinal" DOUBLE PRECISION NOT NULL,
    "origemRendimento" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "origemBonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "origemCapital" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carteiraDestinoNome" TEXT NOT NULL DEFAULT 'WD INSIGHT RODRIGUES SOLUCOES E CONSULTORIA LTDA',
    "codigoCarteiraDestino" TEXT NOT NULL DEFAULT '2VPDV-GRUPO',
    "status" "StatusCobrancaServico" NOT NULL DEFAULT 'CONFIRMADA',
    "idempotencyKey" TEXT,
    "txid" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processadoEm" TIMESTAMP(3),

    CONSTRAINT "CobrancaServico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServicoPacote_codigo_key" ON "ServicoPacote"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "ContratoServico_userId_servicoId_key" ON "ContratoServico"("userId", "servicoId");

-- CreateIndex
CREATE UNIQUE INDEX "CobrancaServico_idempotencyKey_key" ON "CobrancaServico"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "CobrancaServico_txid_key" ON "CobrancaServico"("txid");

-- AddForeignKey
ALTER TABLE "ContratoServico" ADD CONSTRAINT "ContratoServico_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoServico" ADD CONSTRAINT "ContratoServico_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "ServicoPacote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoServico" ADD CONSTRAINT "ContratoServico_liberadoPorId_fkey" FOREIGN KEY ("liberadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CobrancaServico" ADD CONSTRAINT "CobrancaServico_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

