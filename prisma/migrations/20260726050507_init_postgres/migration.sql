-- CreateEnum
CREATE TYPE "TipoPessoa" AS ENUM ('FISICA', 'JURIDICA');

-- CreateEnum
CREATE TYPE "PerfilUsuario" AS ENUM ('USUARIO', 'LIDER', 'ADMIN');

-- CreateEnum
CREATE TYPE "StatusCadastro" AS ENUM ('INCOMPLETO', 'PENDENTE', 'APROVADO', 'SUSPENSO', 'REJEITADO');

-- CreateEnum
CREATE TYPE "OrigemAplicacao" AS ENUM ('NOVA_APLICACAO', 'REAPLICACAO');

-- CreateEnum
CREATE TYPE "StatusAplicacao" AS ENUM ('CONFIRMADA', 'SAQUE_SOLICITADO', 'RETIRADA');

-- CreateEnum
CREATE TYPE "TipoCredito" AS ENUM ('RENDIMENTO', 'BONUS');

-- CreateEnum
CREATE TYPE "TipoSaque" AS ENUM ('CAPITAL', 'RENDIMENTO');

-- CreateEnum
CREATE TYPE "StatusSaque" AS ENUM ('SOLICITADO', 'APROVADO', 'PAGO', 'RECUSADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "ModoProcessamento" AS ENUM ('MANUAL', 'AUTOMATICO');

-- CreateEnum
CREATE TYPE "StatusDistribuicao" AS ENUM ('ATIVA', 'CANCELADA');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT,
    "image" TEXT,
    "perfil" "PerfilUsuario" NOT NULL DEFAULT 'USUARIO',
    "tipoPessoa" "TipoPessoa",
    "statusCadastro" "StatusCadastro" NOT NULL DEFAULT 'INCOMPLETO',
    "senha" TEXT,
    "codigoIndicacao" TEXT,
    "indicadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DistribuicaoMensal" (
    "id" TEXT NOT NULL,
    "periodoInicio" TIMESTAMP(3) NOT NULL,
    "periodoFim" TIMESTAMP(3) NOT NULL,
    "percentual" DOUBLE PRECISION NOT NULL,
    "valorTotal" DOUBLE PRECISION NOT NULL,
    "moeda" TEXT NOT NULL DEFAULT 'BRL',
    "resultadoApurado" TEXT NOT NULL,
    "observacoes" TEXT,
    "status" "StatusDistribuicao" NOT NULL DEFAULT 'ATIVA',
    "criadoPorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DistribuicaoMensal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DistribuicaoParticipante" (
    "id" TEXT NOT NULL,
    "distribuicaoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "capitalElegivel" DOUBLE PRECISION NOT NULL,
    "valorTotalCota" DOUBLE PRECISION NOT NULL,
    "diasCreditados" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DistribuicaoParticipante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aplicacao" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "moeda" TEXT NOT NULL DEFAULT 'BRL',
    "origem" "OrigemAplicacao" NOT NULL DEFAULT 'NOVA_APLICACAO',
    "status" "StatusAplicacao" NOT NULL DEFAULT 'CONFIRMADA',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "liberaEm" TIMESTAMP(3) NOT NULL,
    "solicitacaoSaqueId" TEXT,

    CONSTRAINT "Aplicacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditoCarteira" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" "TipoCredito" NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "moeda" TEXT NOT NULL DEFAULT 'BRL',
    "origem" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "utilizadoEm" TIMESTAMP(3),
    "solicitacaoSaqueId" TEXT,

    CONSTRAINT "CreditoCarteira_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitacaoSaque" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" "TipoSaque" NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "moeda" TEXT NOT NULL DEFAULT 'BRL',
    "status" "StatusSaque" NOT NULL DEFAULT 'SOLICITADO',
    "justificativaRecusa" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processadoEm" TIMESTAMP(3),

    CONSTRAINT "SolicitacaoSaque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PessoaFisica" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nomeCompleto" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "dataNascimento" TIMESTAMP(3) NOT NULL,
    "telefone" TEXT,
    "endereco" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PessoaFisica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PessoaJuridica" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "cnpj" TEXT NOT NULL,
    "representanteLegal" TEXT NOT NULL,
    "cpfRepresentante" TEXT NOT NULL,
    "telefone" TEXT,
    "endereco" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PessoaJuridica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TermoAceite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "versao" TEXT NOT NULL,
    "aceitoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,

    CONSTRAINT "TermoAceite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfiguracaoSistema" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "modoSaqueCapital" "ModoProcessamento" NOT NULL DEFAULT 'MANUAL',
    "modoSaqueRendimento" "ModoProcessamento" NOT NULL DEFAULT 'MANUAL',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracaoSistema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogAuditoria" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "acao" TEXT NOT NULL,
    "detalhes" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogAuditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_codigoIndicacao_key" ON "User"("codigoIndicacao");

-- CreateIndex
CREATE UNIQUE INDEX "DistribuicaoParticipante_distribuicaoId_userId_key" ON "DistribuicaoParticipante"("distribuicaoId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PessoaFisica_userId_key" ON "PessoaFisica"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PessoaFisica_cpf_key" ON "PessoaFisica"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "PessoaJuridica_userId_key" ON "PessoaJuridica"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PessoaJuridica_cnpj_key" ON "PessoaJuridica"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_indicadoPorId_fkey" FOREIGN KEY ("indicadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistribuicaoMensal" ADD CONSTRAINT "DistribuicaoMensal_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistribuicaoParticipante" ADD CONSTRAINT "DistribuicaoParticipante_distribuicaoId_fkey" FOREIGN KEY ("distribuicaoId") REFERENCES "DistribuicaoMensal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistribuicaoParticipante" ADD CONSTRAINT "DistribuicaoParticipante_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aplicacao" ADD CONSTRAINT "Aplicacao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aplicacao" ADD CONSTRAINT "Aplicacao_solicitacaoSaqueId_fkey" FOREIGN KEY ("solicitacaoSaqueId") REFERENCES "SolicitacaoSaque"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditoCarteira" ADD CONSTRAINT "CreditoCarteira_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditoCarteira" ADD CONSTRAINT "CreditoCarteira_solicitacaoSaqueId_fkey" FOREIGN KEY ("solicitacaoSaqueId") REFERENCES "SolicitacaoSaque"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoSaque" ADD CONSTRAINT "SolicitacaoSaque_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PessoaFisica" ADD CONSTRAINT "PessoaFisica_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PessoaJuridica" ADD CONSTRAINT "PessoaJuridica_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TermoAceite" ADD CONSTRAINT "TermoAceite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogAuditoria" ADD CONSTRAINT "LogAuditoria_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
