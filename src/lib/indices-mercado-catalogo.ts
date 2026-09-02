import type { IndicadorMercado } from "@prisma/client";

/** Constantes puras (sem import de prisma/DB) — seguro pra usar em componentes client, diferente
 *  de indices-mercado.ts (que toca o banco e não pode ser importado do lado do browser). */

export const LABEL_INDICADOR: Record<IndicadorMercado, string> = {
  CDI: "CDI",
  CDB: "CDB (100% do CDI)",
  IPCA: "IPCA",
  IBOVESPA: "Ibovespa",
  FOCCUS: "Foccus Invest (histórico manual)",
};

/** Cores fixas por índice — só pra diferenciar visualmente as barras/legendas, sem nenhum
 *  significado de "melhor" ou "pior". */
export const COR_INDICADOR: Record<IndicadorMercado, string> = {
  CDI: "#1E88E5",
  CDB: "#00ACC1",
  IPCA: "#FB8C00",
  IBOVESPA: "#8E24AA",
  FOCCUS: "#f2d675",
};

/** Todos os índices que o admin pode lançar em Lançar/atualizar índice — inclui FOCCUS (histórico
 *  manual, só fallback pra meses sem Distribuição real). */
export const ORDEM_INDICADORES: IndicadorMercado[] = ["CDI", "CDB", "IPCA", "IBOVESPA", "FOCCUS"];

export type IndicadorMercadoDeVerdade = Exclude<IndicadorMercado, "FOCCUS">;

/** Só os índices de mercado de fato (nunca a Foccus) — usado pra desenhar as barras "contra" no
 *  gráfico comparativo; a Foccus tem sua própria barra dourada dedicada, computada separadamente
 *  (real quando existe Distribuição, senão o fallback manual — ver obterComparativoRentabilidade). */
export const INDICADORES_MERCADO: IndicadorMercadoDeVerdade[] = ["CDI", "CDB", "IPCA", "IBOVESPA"];
