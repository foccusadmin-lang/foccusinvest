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

  if (indicador === "FOCCUS") {
    // Histórico manual só serve de fallback pra meses SEM Distribuição real — bloqueia aqui pra
    // não deixar o admin achar que salvou um valor que na prática nunca vai aparecer (a real
    // sempre tem prioridade automática).
    const proximoMes = new Date(Date.UTC(ano, mesNum, 1));
    const distribuicaoDoMes = await prisma.distribuicaoMensal.findFirst({
      where: { status: "ATIVA", periodoInicio: { gte: dataMes, lt: proximoMes } },
    });
    if (distribuicaoDoMes) {
      return {
        error:
          "Esse mês já tem uma Distribuição real lançada — ela sempre tem prioridade, então um valor manual da Foccus aqui nunca apareceria. Use o histórico manual só pra meses sem nenhuma Distribuição (ex: período anterior ao rastreamento automático).",
      };
    }
  }

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
  /** null quando não há nenhum dado da Foccus pra esse mês (nem Distribuição real, nem
   *  histórico manual) — evita mostrar "0%" como se fosse um resultado real. */
  foccus: number | null;
  /** De onde veio `foccus`: "distribuicao" é dado real (soma das Distribuições ATIVAS do mês —
   *  sempre tem prioridade quando existe). "manual" é um lançamento de histórico feito pelo
   *  admin (índice FOCCUS em BenchmarkMercado) — só usado como fallback pra meses SEM nenhuma
   *  Distribuição real, ex: período anterior ao início do rastreamento automático (dados
   *  herdados de uma plataforma anterior). null quando não há dado nenhum. */
  foccusOrigem: "distribuicao" | "manual" | null;
  /** Nunca inclui a chave FOCCUS — os índices de mercado propriamente ditos. */
  valores: Partial<Record<IndicadorMercado, number>>;
};

/** Monta a série comparativa "Rentabilidade vs Índices" dos últimos `mesesQtd` meses — a
 *  rentabilidade da Foccus é sempre a real (DistribuicaoMensal.percentual, já existente) quando
 *  existe; só cai pro histórico manual (índice FOCCUS) nos meses em que não há nenhuma
 *  Distribuição lançada ainda. Os índices de mercado (CDI/CDB/IPCA/Ibovespa) são sempre
 *  lançados manualmente pelo admin. Nenhuma meta, nenhuma projeção. */
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
    const foccusReal =
      distribuicoesDoMes.length > 0 ? distribuicoesDoMes.reduce((acc, d) => acc + d.percentual, 0) : null;

    const valores: Partial<Record<IndicadorMercado, number>> = {};
    let foccusManual: number | null = null;
    for (const b of benchmarks) {
      if (chaveDoMes(b.mes) !== chave) continue;
      if (b.indicador === "FOCCUS") {
        foccusManual = b.valorPercentual;
        continue;
      }
      valores[b.indicador] = b.valorPercentual;
    }

    const foccus = foccusReal !== null ? foccusReal : foccusManual;
    const foccusOrigem: PontoComparativo["foccusOrigem"] =
      foccusReal !== null ? "distribuicao" : foccusManual !== null ? "manual" : null;

    return { mes, foccus, foccusOrigem, valores };
  });
}
