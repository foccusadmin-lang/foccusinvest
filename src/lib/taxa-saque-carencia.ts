import type { TxClient } from "@/lib/carteira";
import { arredondarParaCentavos } from "@/lib/valor-centavos";

/** Taxa de antecipação de carência: 15% SOMADOS ao valor que o cliente precisa receber. Se ele
 *  precisa de R$ 4.000,00, a taxa é R$ 600,00 e saem R$ 4.600,00 do capital — o Pix é de
 *  R$ 4.000,00. Usada no saque assistido do admin (restrito/usuarios) e no saque de emergência
 *  self-service (lib/emergencia.ts). */
export const TAXA_SAQUE_CARENCIA = 0.15;

export type SaqueCarencia = {
  /** O que o cliente recebe no Pix (o valor digitado). */
  valorLiquido: number;
  taxa: number;
  /** O que sai do capital do cliente (líquido + taxa). */
  valorBruto: number;
};

export function calcularSaqueCarencia(valorLiquido: number): SaqueCarencia {
  const liquido = arredondarParaCentavos(valorLiquido);
  const taxa = arredondarParaCentavos(liquido * TAXA_SAQUE_CARENCIA);
  return { valorLiquido: liquido, taxa, valorBruto: arredondarParaCentavos(liquido + taxa) };
}

/** Maior valor líquido que dá pra sacar sem o bruto (líquido + taxa) passar de `capital`. */
export function maximoLiquidoSaqueCarencia(capital: number): number {
  const cabe = (liquido: number) => calcularSaqueCarencia(liquido).valorBruto <= capital + 0.005;
  let liquido = Math.floor((capital / (1 + TAXA_SAQUE_CARENCIA)) * 100) / 100;
  // Arredondamentos de centavo podem deixar a estimativa 1 centavo acima ou abaixo do limite exato.
  while (liquido > 0 && !cabe(liquido)) liquido = arredondarParaCentavos(liquido - 0.01);
  while (cabe(arredondarParaCentavos(liquido + 0.01))) liquido = arredondarParaCentavos(liquido + 0.01);
  return Math.max(0, liquido);
}

export const EMAIL_ADMINISTRADORA = "foccusadmin@gmail.com";

const EPSILON = 0.005;

/** Os 15% retidos viram fundo de caixa do sistema: creditados como RENDIMENTO na conta da Foccus
 *  Administradora, com rastro (no `origem`) de qual investidor gerou a taxa. */
export async function creditarTaxaSaqueCarencia(
  tx: TxClient,
  investidorNome: string,
  taxaAntecipacao: number
): Promise<void> {
  if (taxaAntecipacao <= EPSILON) return;
  const administradora = await tx.user.findFirst({ where: { email: EMAIL_ADMINISTRADORA } });
  if (!administradora) return;
  await tx.creditoCarteira.create({
    data: {
      userId: administradora.id,
      tipo: "RENDIMENTO",
      valor: taxaAntecipacao,
      moeda: "BRL",
      origem: `Taxa de saque de carência — ${investidorNome}`,
    },
  });
}
