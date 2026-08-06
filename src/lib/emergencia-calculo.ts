/** Cálculos puros do saque de emergência — sem nenhuma dependência de servidor (Prisma etc.),
 *  pra poder ser importado tanto no server quanto direto num componente client (ex: pra mostrar
 *  a prévia do valor líquido enquanto o investidor digita). */

/** Desconto administrativo cobrado sobre o rendimento, quando o investidor opta por incluí-lo
 *  no saque de emergência (o capital liberado não sofre esse desconto). */
export const DESCONTO_RENDIMENTO_EMERGENCIAL = 0.15;

/** Tabela regressiva oficial do IOF sobre resgate antecipado (Anexo I da Instrução Normativa
 *  RFB nº 907/2009) — incide só sobre o rendimento, conforme os dias corridos desde o início da
 *  aplicação vinculada até a data do saque. Do dia 30 em diante, alíquota zero. */
const TABELA_IOF_REGRESSIVA = [
  96, 93, 90, 86, 83, 80, 76, 73, 70, 66, 63, 60, 56, 53, 50, 46, 43, 40, 36, 33, 30, 26, 23, 20,
  16, 13, 10, 6, 3, 0,
];

export function diasCorridosDesde(inicio: Date, agora: Date = new Date()): number {
  const ms = agora.getTime() - inicio.getTime();
  return Math.max(1, Math.floor(ms / (24 * 60 * 60 * 1000)) + 1);
}

/** Alíquota do IOF (0 a 96) pros dias corridos informados. */
export function aliquotaIOF(diasCorridos: number): number {
  if (diasCorridos >= 30) return 0;
  return TABELA_IOF_REGRESSIVA[diasCorridos - 1] ?? 0;
}

export function calcularIOF(rendimentoBruto: number, diasCorridos: number): number {
  if (rendimentoBruto <= 0) return 0;
  return rendimentoBruto * (aliquotaIOF(diasCorridos) / 100);
}

export type EstimativaSaqueEmergencial = {
  capitalSolicitado: number;
  rendimentoBruto: number;
  descontoRendimento: number;
  iof: number;
  rendimentoLiquido: number;
  valorLiquido: number;
  diasCorridos: number;
  aliquotaIOF: number;
};

export function estimarSaqueEmergencial(
  capitalSolicitado: number,
  rendimentoDisponivel: number,
  incluirRendimento: boolean,
  dataInicioAplicacao: Date
): EstimativaSaqueEmergencial {
  const diasCorridos = diasCorridosDesde(dataInicioAplicacao);
  const rendimentoBruto = incluirRendimento ? rendimentoDisponivel : 0;
  const descontoRendimento = rendimentoBruto * DESCONTO_RENDIMENTO_EMERGENCIAL;
  const iof = calcularIOF(rendimentoBruto, diasCorridos);
  const rendimentoLiquido = Math.max(0, rendimentoBruto - descontoRendimento - iof);

  return {
    capitalSolicitado,
    rendimentoBruto,
    descontoRendimento,
    iof,
    rendimentoLiquido,
    valorLiquido: capitalSolicitado + rendimentoLiquido,
    diasCorridos,
    aliquotaIOF: aliquotaIOF(diasCorridos),
  };
}
