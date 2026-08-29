-- Renomeia o status "APROVADO" pra "AGUARDANDO_PAGAMENTO" (mesmo significado: admin já
-- aprovou/debitou da carteira, falta só confirmar o pagamento de fato no banco) — preserva
-- todos os registros existentes, só o rótulo muda.
ALTER TYPE "StatusSaque" RENAME VALUE 'APROVADO' TO 'AGUARDANDO_PAGAMENTO';

-- Tipo da chave Pix escolhido pelo investidor no formulário de saque.
CREATE TYPE "TipoChavePix" AS ENUM ('TELEFONE', 'CPF', 'CNPJ', 'EMAIL', 'ALEATORIA');

-- Novos campos em SolicitacaoSaque: snapshot do investidor, chave Pix normalizada, Pix Copia e
-- Cola + QR Code + TXID, data programada de pagamento, idempotência e quem processou.
ALTER TABLE "SolicitacaoSaque"
  ADD COLUMN "investidorNome" TEXT,
  ADD COLUMN "investidorEmail" TEXT,
  ADD COLUMN "chavePixOriginal" TEXT,
  ADD COLUMN "chavePixNormalizada" TEXT,
  ADD COLUMN "chavePixTipo" "TipoChavePix",
  ADD COLUMN "pixPayload" TEXT,
  ADD COLUMN "pixQrCodePng" BYTEA,
  ADD COLUMN "pixTxid" TEXT,
  ADD COLUMN "dataProgramadaPagamento" TIMESTAMP(3),
  ADD COLUMN "pagoEm" TIMESTAMP(3),
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "processadoPorId" TEXT;

CREATE UNIQUE INDEX "SolicitacaoSaque_pixTxid_key" ON "SolicitacaoSaque"("pixTxid");
CREATE UNIQUE INDEX "SolicitacaoSaque_idempotencyKey_key" ON "SolicitacaoSaque"("idempotencyKey");

ALTER TABLE "SolicitacaoSaque"
  ADD CONSTRAINT "SolicitacaoSaque_processadoPorId_fkey"
  FOREIGN KEY ("processadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Configuração admin: cidade usada no QR Code Pix e regra de "paga na mesma sexta ou na
-- seguinte" quando o saque é solicitado numa sexta-feira.
ALTER TABLE "ConfiguracaoSistema"
  ADD COLUMN "cidadePagamentoPix" TEXT NOT NULL DEFAULT 'JANDIRA',
  ADD COLUMN "saquePagaMesmaSexta" BOOLEAN NOT NULL DEFAULT true;
