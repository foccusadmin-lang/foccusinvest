-- Reaplica a renomeação de APROVADO -> AGUARDANDO_PAGAMENTO, agora publicada junto do código
-- que já espera esse nome (ver commit desta migração). A tentativa anterior (migração
-- 20260826120000) tinha sido revertida por 20260829020000 porque o código publicado em
-- produção ainda esperava o nome antigo — esta migração e o deploy do código andam juntos.
ALTER TYPE "StatusSaque" RENAME VALUE 'APROVADO' TO 'AGUARDANDO_PAGAMENTO';
