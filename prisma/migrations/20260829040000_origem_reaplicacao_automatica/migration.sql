-- Novo valor de OrigemAplicacao pra distinguir reaplicação automática (lançada sozinha pelo
-- sistema) de reaplicação manual no histórico do investidor e do admin. Aditivo: não quebra
-- nada do código já publicado, que continua só usando REAPLICACAO.
ALTER TYPE "OrigemAplicacao" ADD VALUE 'REAPLICACAO_AUTOMATICA';
