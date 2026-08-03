-- CreateEnum
CREATE TYPE "TipoEntidade" AS ENUM ('IGREJA', 'ONG', 'ASSOCIACAO', 'INSTITUTO', 'PROJETO_SOCIAL', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusEntidade" AS ENUM ('CADASTRO_INCOMPLETO', 'AGUARDANDO_DOCUMENTOS', 'EM_ANALISE', 'AGUARDANDO_SALDO_ATIVACAO', 'APROVADA', 'ATIVA', 'BLOQUEADA', 'SUSPENSA', 'INATIVA');

-- CreateEnum
CREATE TYPE "TipoDoacao" AS ENUM ('SALDO_DISPONIVEL', 'NOVA_APLICACAO');

-- CreateEnum
CREATE TYPE "StatusDoacao" AS ENUM ('AGUARDANDO_PAGAMENTO', 'EM_PROCESSAMENTO', 'CONFIRMADA', 'CANCELADA', 'ESTORNADA', 'EM_ANALISE');

-- AlterEnum
ALTER TYPE "OrigemAplicacao" ADD VALUE 'DOACAO';

-- AlterEnum
ALTER TYPE "PerfilUsuario" ADD VALUE 'ENTIDADE';

-- CreateTable
CREATE TABLE "Entidade" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipoEntidade" "TipoEntidade" NOT NULL,
    "descricao" TEXT,
    "logoUrl" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "chavePix" TEXT,
    "status" "StatusEntidade" NOT NULL DEFAULT 'CADASTRO_INCOMPLETO',
    "documentosAprovados" BOOLEAN NOT NULL DEFAULT false,
    "termosAceitos" BOOLEAN NOT NULL DEFAULT false,
    "taxaAtivacao" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dataAtivacao" TIMESTAMP(3),
    "ativadaPorId" TEXT,
    "podeReceberDoacao" BOOLEAN NOT NULL DEFAULT false,
    "podeReceberAplicacao" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Doacao" (
    "id" TEXT NOT NULL,
    "doadorId" TEXT NOT NULL,
    "entidadeId" TEXT NOT NULL,
    "tipoDoacao" "TipoDoacao" NOT NULL,
    "valorBruto" DOUBLE PRECISION NOT NULL,
    "taxa" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorLiquido" DOUBLE PRECISION NOT NULL,
    "origemSaldo" TEXT,
    "doacaoAnonima" BOOLEAN NOT NULL DEFAULT false,
    "status" "StatusDoacao" NOT NULL DEFAULT 'AGUARDANDO_PAGAMENTO',
    "comprovante" BYTEA,
    "comprovanteNome" TEXT,
    "comprovanteTipo" TEXT,
    "aplicacaoId" TEXT,
    "aprovadoPorId" TEXT,
    "aprovadoEm" TIMESTAMP(3),
    "motivoRecusa" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmadoEm" TIMESTAMP(3),

    CONSTRAINT "Doacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Entidade_userId_key" ON "Entidade"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Doacao_aplicacaoId_key" ON "Doacao"("aplicacaoId");

-- AddForeignKey
ALTER TABLE "Entidade" ADD CONSTRAINT "Entidade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entidade" ADD CONSTRAINT "Entidade_ativadaPorId_fkey" FOREIGN KEY ("ativadaPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doacao" ADD CONSTRAINT "Doacao_doadorId_fkey" FOREIGN KEY ("doadorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doacao" ADD CONSTRAINT "Doacao_entidadeId_fkey" FOREIGN KEY ("entidadeId") REFERENCES "Entidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doacao" ADD CONSTRAINT "Doacao_aprovadoPorId_fkey" FOREIGN KEY ("aprovadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
