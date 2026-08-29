export type SaqueParaTotais = { tipo: "CAPITAL" | "RENDIMENTO" | "BONUS"; valor: number };

export type TotaisSaque = {
  rendimento: number;
  capital: number;
  geral: number;
  quantidade: number;
};

/** Totais exibidos no topo da tela de Solicitações de Saque — Bônus entra junto de
 *  "rendimento solicitado" (mesma família de crédito: RENDIMENTO/BONUS vêm de CreditoCarteira,
 *  CAPITAL vem de Aplicacao), nunca misturado com capital. */
export function calcularTotaisSaque(saques: SaqueParaTotais[]): TotaisSaque {
  const rendimento = saques
    .filter((s) => s.tipo === "RENDIMENTO" || s.tipo === "BONUS")
    .reduce((acc, s) => acc + s.valor, 0);
  const capital = saques.filter((s) => s.tipo === "CAPITAL").reduce((acc, s) => acc + s.valor, 0);
  return { rendimento, capital, geral: rendimento + capital, quantidade: saques.length };
}
