import type { TxClient } from "@/lib/carteira";

/** Taxa de antecipação de carência: o valor bruto sai INTEGRALMENTE do capital do investidor, mas
 *  o Pix pago já sai 15% menor. Usada no saque assistido do admin (restrito/usuarios) e no saque
 *  de emergência self-service (lib/emergencia.ts). */
export const TAXA_SAQUE_CARENCIA = 0.15;

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
