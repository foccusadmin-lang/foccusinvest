import type { CategoriaBem } from "@prisma/client";

/** Carência mínima padrão de cada categoria de bem, em meses — o admin pode ajustar caso a caso
 *  na hora de confirmar o aporte (ver aprovarAporte com ajusteBem), de acordo com o valor
 *  aportado e as condições do bem avaliado. */
export const CARENCIA_MESES_PADRAO_BEM: Record<CategoriaBem, number> = {
  IMOVEL: 24,
  AUTOMOVEL: 9,
  ELETRONICO: 6,
};

export const LABEL_CATEGORIA_BEM: Record<CategoriaBem, string> = {
  IMOVEL: "Imóvel",
  AUTOMOVEL: "Automóvel",
  ELETRONICO: "Eletrônico",
};

/** Igual a calcularLiberacao (lib/carteira.ts), mas em meses em vez de dias fixos — usado pra
 *  carência de aportes em bens, cuja regra é "X meses mínimo", não "90 dias fixos". */
export function calcularLiberacaoBem(meses: number, dataBase: Date = new Date()): Date {
  const data = new Date(dataBase);
  data.setMonth(data.getMonth() + meses);
  return data;
}
