/** Arredonda um valor monetário pra exatamente 2 casas decimais, passando por centavos
 *  inteiros no meio do caminho — evita resíduo de ponto flutuante (ex: 10.1 + 20.2 dando
 *  30.299999999999997 em vez de 30.3) contaminar o valor que entra no QR Code/payload Pix e
 *  no banco. O restante da carteira (Aplicacao.valor, CreditoCarteira.valor etc.) já usa Float
 *  em todo o projeto — aqui só garante que o valor final do saque nunca carrega esse resíduo. */
export function arredondarParaCentavos(valor: number): number {
  return Math.round(valor * 100) / 100;
}
