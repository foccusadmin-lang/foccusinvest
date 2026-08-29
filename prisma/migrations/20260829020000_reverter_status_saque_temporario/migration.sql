-- URGENTE: reverte a renomeação de APROVADO -> AGUARDANDO_PAGAMENTO feita mais cedo nesta sessão
-- (migração 20260826120000_saque_pix_qrcode). O código atualmente publicado em produção ainda
-- espera "APROVADO" e estava quebrando (StatusSaque não tinha mais esse valor). Reverte só esse
-- pedaço pra restaurar o site AGORA; a renomeação será reaplicada junto do deploy completo da
-- funcionalidade de Pix/QR Code, quando o código novo for publicado.
ALTER TYPE "StatusSaque" RENAME VALUE 'AGUARDANDO_PAGAMENTO' TO 'APROVADO';
