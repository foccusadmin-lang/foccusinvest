import type { IndicadorMercado } from "@prisma/client";

/** Constantes puras (sem import de prisma/DB) — seguro pra usar em componentes client, diferente
 *  de indices-mercado.ts (que toca o banco e não pode ser importado do lado do browser). */

export const LABEL_INDICADOR: Record<IndicadorMercado, string> = {
  CDI: "CDI",
  CDB: "CDB",
  IPCA: "IPCA",
  IBOVESPA: "Ibovespa",
};

/** Cores fixas por índice — só pra diferenciar visualmente as barras/legendas, sem nenhum
 *  significado de "melhor" ou "pior". */
export const COR_INDICADOR: Record<IndicadorMercado, string> = {
  CDI: "#1E88E5",
  CDB: "#00ACC1",
  IPCA: "#FB8C00",
  IBOVESPA: "#8E24AA",
};

export const ORDEM_INDICADORES: IndicadorMercado[] = ["CDI", "CDB", "IPCA", "IBOVESPA"];
