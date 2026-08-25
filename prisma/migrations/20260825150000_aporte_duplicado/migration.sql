-- Guarda o hash do comprovante e a referência ao aporte original quando um aporte é
-- identificado como possível duplicata (mesmo investidor, mesmo valor, mesmo comprovante).
ALTER TABLE "Aplicacao" ADD COLUMN "comprovanteHash" TEXT;
ALTER TABLE "Aplicacao" ADD COLUMN "aporteDuplicadoDeId" TEXT;

CREATE INDEX "Aplicacao_userId_valor_comprovanteHash_idx" ON "Aplicacao"("userId", "valor", "comprovanteHash");
