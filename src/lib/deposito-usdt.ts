/** Endereço real da Foccus na Binance pra receber depósitos em USDT — rede BEP20 (BNB Smart
 *  Chain), escolhida pelo custo de rede baixo. Sem integração de custódia própria nem API de
 *  exchange: o investidor manda o USDT e informa o hash da transação (TXID) como comprovante; o
 *  admin confere manualmente no BscScan e aprova, exatamente como já faz com aporte via Pix. */
export const USDT_REDE = "BEP20 (BNB Smart Chain)";
export const USDT_ENDERECO = "0x0cd8d16a0fb617563f9650cf3e1d270e84bf6403";

export function linkBscScan(txid: string): string {
  return `https://bscscan.com/tx/${txid}`;
}
