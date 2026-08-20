import { prisma } from "@/lib/prisma";

export type PontoComparativo = { data: Date; acumulado: number };

export type VitrineOperacao = {
  id: string;
  nome: string;
  moedas: string;
  ativa: boolean;
  esperadoMin: number;
  esperadoMax: number;
  acumulado: number;
  ontem: number;
  serieComparativo: PontoComparativo[];
};

/** Busca a estratégia de operação ativa mais recente (vitrine institucional exibida no painel do
 *  investidor) e monta a série acumulada pro gráfico "Comparativo" — cada ponto soma a variação
 *  do dia com o acumulado de todos os dias anteriores, em ordem cronológica. Retorna null se não
 *  houver nenhuma estratégia ativa cadastrada ainda. */
export async function obterVitrineOperacaoAtiva(): Promise<VitrineOperacao | null> {
  const estrategia = await prisma.estrategiaOperacao.findFirst({
    where: { ativa: true },
    orderBy: { criadoEm: "desc" },
    include: { pontos: { orderBy: { data: "asc" } } },
  });
  if (!estrategia) return null;

  let acumuladoCorrido = 0;
  const serieComparativo: PontoComparativo[] = estrategia.pontos.map((p) => {
    acumuladoCorrido += p.variacaoDia;
    return { data: p.data, acumulado: acumuladoCorrido };
  });

  const ultimoPonto = estrategia.pontos[estrategia.pontos.length - 1];

  return {
    id: estrategia.id,
    nome: estrategia.nome,
    moedas: estrategia.moedas,
    ativa: estrategia.ativa,
    esperadoMin: estrategia.esperadoMin,
    esperadoMax: estrategia.esperadoMax,
    acumulado: acumuladoCorrido,
    ontem: ultimoPonto?.variacaoDia ?? 0,
    serieComparativo,
  };
}
