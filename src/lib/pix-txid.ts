import { randomUUID } from "crypto";

/** TXID do Pix (campo 05 dentro do Additional Data Field, tag 62) — precisa ser único, só
 *  letras e números, e no máximo 25 caracteres (regra do Bacen). Usado pra relacionar o
 *  pagamento (visível no extrato do banco) de volta à solicitação de saque que o gerou. */
const TAMANHO_MAXIMO_TXID = 25;

export function gerarTxid(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const aleatorio = randomUUID().replace(/-/g, "").toUpperCase();
  return `SAQ${timestamp}${aleatorio}`.slice(0, TAMANHO_MAXIMO_TXID);
}
