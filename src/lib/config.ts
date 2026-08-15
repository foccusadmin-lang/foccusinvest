export const ADMIN_EMAIL = "foccusadmin@gmail.com";

export const PIX_CHAVE = "66.148.465/0001-00";
export const PIX_TIPO_CHAVE = "CNPJ";
export const PIX_BENEFICIARIO = "FOCCUS SERVICOS COMBINADOS LTDA";
export const PIX_CIDADE = "JANDIRA";

/** Número de WhatsApp do admin pra onde o Guia Foccus redireciona quem pede pra falar com um
 *  humano — só dígitos com DDI (55), formato aceito pelo link wa.me. */
export const TELEFONE_ATENDIMENTO_ADMIN = "5511974041863";
export const TELEFONE_ATENDIMENTO_ADMIN_FORMATADO = "(11) 97404-1863";
export function mensagemSuportePadrao(nome: string): string {
  return `Olá, ${nome}, poderia me auxiliar!`;
}

export const EMAIL_CONTRATOS_REMETENTE = "Foccus Invest <contratos@foccusinvest.com.br>";
