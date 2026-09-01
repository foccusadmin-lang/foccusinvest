import { prisma } from "@/lib/prisma";
import type { IndicadorMercado } from "@prisma/client";

export { LABEL_INDICADOR, COR_INDICADOR, ORDEM_INDICADORES } from "@/lib/indices-mercado-catalogo";

function primeiroDiaDoMes(data: Date): Date {
  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), 1));
}

function chaveDoMes(data: Date): string {
  return `${data.getUTCFullYear()}-${data.getUTCMonth()}`;
}

export type BenchmarkComAutor = {
  id: string;
  indicador: IndicadorMercado;
  mes: Date;
  valorPercentual: number;
  criadoPor: { name: string | null; email: string };
  atualizadoEm: Date;
};

/** Lista todos os valores de índice já lançados, mais recentes primeiro — usado na tela do admin
 *  pra gerenciar (editar/excluir) os lançamentos existentes. */
export async function listarBenchmarks(): Promise<BenchmarkComAutor[]> {
  return prisma.benchmarkMercado.findMany({
    orderBy: [{ mes: "desc" }, { indicador: "asc" }],
    include: { criadoPor: { select: { name: true, email: true } } },
  });
}

export type SalvarBenchmarkParams = {
  indicador: IndicadorMercado;
  mes: string; // "YYYY-MM"
  valorPercentual: number;
  criadoPorId: string;
};

/** Cria ou substitui (upsert) o valor de um índice pra um mês específico — só o admin lança,
 *  manualmente; não há integração automática com nenhuma fonte de mercado. */
export async function salvarBenchmark(params: SalvarBenchmarkParams): Promise<{ error?: string }> {
  const { indicador, mes, valorPercentual, criadoPorId } = params;

  if (!/^\d{4}-\d{2}$/.test(mes)) return { error: "Escolha um mês válido." };
  if (Number.isNaN(valorPercentual)) return { error: "Informe um valor percentual válido." };

  const [ano, mesNum] = mes.split("-").map(Number);
  const dataMes = new Date(Date.UTC(ano, mesNum - 1, 1));

  await prisma.benchmarkMercado.upsert({
    where: { indicador_mes: { indicador, mes: dataMes } },
    create: { indicador, mes: dataMes, valorPercentual, criadoPorId },
    update: { valorPercentual, criadoPorId },
  });

  return {};
}

export async function excluirBenchmark(id: string): Promise<void> {
  await prisma.benchmarkMercado.delete({ where: { id } });
}

export type PontoComparativo = {
  mes: Date;
  /** null quando não houve nenhuma distribuição lançada nesse mês (evita mostrar "0%" como se
   *  fosse um resultado real). Soma o percentual de todas as distribuições ATIVAS do mês, caso
   *  tenha mais de um lançamento no mesmo mês. */
  foccus: number | null;
  valores: Partial<Record<IndicadorMercado, number>>;
};

/** Monta a série comparativa "Rentabilidade vs Índices" dos últimos `mesesQtd` meses — só dado
 *  histórico já realizado: a rentabilidade distribuída de fato (DistribuicaoMensal.percentual,
 *  já existente) e os índices de mercado lançados manualmente pelo admin. Nenhuma meta, nenhuma
 *  projeção. */
export async function obterComparativoRentabilidade(mesesQtd = 6): Promise<PontoComparativo[]> {
  const agora = new Date();
  const meses = Array.from({ length: mesesQtd }, (_, i) =>
    primeiroDiaDoMes(new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() - (mesesQtd - 1 - i), 1)))
  );
  const inicio = meses[0];

  const [distribuicoes, benchmarks] = await Promise.all([
    prisma.distribuicaoMensal.findMany({
      where: { status: "ATIVA", periodoInicio: { gte: inicio } },
      select: { percentual: true, periodoInicio: true },
    }),
    prisma.benchmarkMercado.findMany({ where: { mes: { gte: inicio } } }),
  ]);

  return meses.map((mes) => {
    const chave = chaveDoMes(mes);
    const distribuicoesDoMes = distribuicoes.filter((d) => chaveDoMes(d.periodoInicio) === chave);
    const foccus =
      distribuicoesDoMes.length > 0 ? distribuicoesDoMes.reduce((acc, d) => acc + d.percentual, 0) : null;

    const valores: Partial<Record<IndicadorMercado, number>> = {};
    for (const b of benchmarks) {
      if (chaveDoMes(b.mes) === chave) valores[b.indicador] = b.valorPercentual;
    }

    return { mes, foccus, valores };
  });
}
