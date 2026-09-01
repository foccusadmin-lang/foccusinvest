import { prisma } from "@/lib/prisma";
import { criarDistribuicao, SemCapitalElegivelError } from "@/lib/distribuicao";

/**
 * Faixas diárias (% do capital) por tipo de dia — exatamente como definido pelo usuário: dias
 * úteis comuns têm rendimento moderado, sexta tem o pico da semana, fim de semana fica mais
 * baixo. Usadas pra sortear o cronograma de uma campanha inteira na criação (ver
 * gerarCronogramaDiario). Não inventar outros números — só os que foram dados.
 */
export const FAIXA_SEGUNDA_A_QUINTA = { min: 0.1, max: 0.16 };
export const FAIXA_SEXTA = { min: 0.27, max: 0.33 };
export const FAIXA_FIM_DE_SEMANA = { min: 0.05, max: 0.08 };

function faixaDoDia(data: Date): { min: number; max: number } {
  const diaSemana = data.getUTCDay(); // 0=domingo, 5=sexta, 6=sábado
  if (diaSemana === 5) return FAIXA_SEXTA;
  if (diaSemana === 0 || diaSemana === 6) return FAIXA_FIM_DE_SEMANA;
  return FAIXA_SEGUNDA_A_QUINTA;
}

function sortearNaFaixa(faixa: { min: number; max: number }): number {
  return faixa.min + Math.random() * (faixa.max - faixa.min);
}

function arredondar2(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function listarDias(periodoInicio: Date, periodoFim: Date): Date[] {
  const dias: Date[] = [];
  const cursor = new Date(periodoInicio);
  while (cursor <= periodoFim) {
    dias.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dias;
}

export type DiaCronograma = { data: Date; percentual: number };

/**
 * Sorteia o percentual de cada dia do período dentro da faixa do seu tipo de dia (seg-qui /
 * sexta / fim de semana) e ajusta o ÚLTIMO dia pra soma bater exatamente com `percentualTotal`
 * — mesmo padrão do exemplo fornecido (o resíduo de arredondamento é absorvido no último dia,
 * mesmo que isso empurre aquele dia pra fora da faixa normal do seu tipo). Se um único dia não
 * puder absorver o resíduo sem ficar negativo (período muito curto ou percentual muito baixo em
 * relação ao mínimo dos outros dias), cai pra um fallback seguro: escala todos os dias
 * proporcionalmente pra bater o total, sem nenhum dia negativo.
 */
export function gerarCronogramaDiario(
  percentualTotal: number,
  periodoInicio: Date,
  periodoFim: Date
): DiaCronograma[] {
  const dias = listarDias(periodoInicio, periodoFim);
  if (dias.length === 0) return [];

  const valoresBrutos = dias.map((data) => sortearNaFaixa(faixaDoDia(data)));

  if (dias.length === 1) {
    return [{ data: dias[0], percentual: arredondar2(percentualTotal) }];
  }

  const valoresArredondados = valoresBrutos.slice(0, -1).map(arredondar2);
  const somaSemUltimo = valoresArredondados.reduce((acc, v) => acc + v, 0);
  const ultimoDia = arredondar2(percentualTotal - somaSemUltimo);

  if (ultimoDia >= 0) {
    return dias.map((data, i) => ({
      data,
      percentual: i === dias.length - 1 ? ultimoDia : valoresArredondados[i],
    }));
  }

  // Fallback: o último dia ficaria negativo — escala todo mundo proporcionalmente ao total
  // sorteado originalmente, garantindo que nenhum dia fique negativo.
  const somaTotalBruta = valoresBrutos.reduce((acc, v) => acc + v, 0);
  const fator = somaTotalBruta > 0 ? percentualTotal / somaTotalBruta : 0;
  const escalados = valoresBrutos.map((v) => arredondar2(Math.max(v * fator, 0)));

  // O arredondamento de cada dia individualmente pode deixar um resíduo na soma total — distribui
  // esse resíduo entre os dias (começando pelo de maior valor, que tem mais folga), zerando um
  // dia e passando o restante adiante se um único dia não bastar pra absorver tudo sem ficar
  // negativo. Garante soma exata mesmo nesse caminho de fallback.
  const somaEscalada = escalados.reduce((acc, v) => acc + v, 0);
  const ajustados = distribuirResiduo(escalados, arredondar2(percentualTotal - somaEscalada));

  return dias.map((data, i) => ({ data, percentual: ajustados[i] }));
}

/** Aplica `residuo` (positivo ou negativo) sobre `valores`, sempre mantendo cada valor >= 0 —
 *  tenta absorver tudo no dia de maior valor primeiro; se não couber sem ficar negativo, zera
 *  esse dia e carrega o restante do resíduo pro próximo maior, até zerar. */
function distribuirResiduo(valores: number[], residuoInicial: number): number[] {
  const resultado = [...valores];
  let residuo = residuoInicial;
  const indicesPorValorDesc = resultado.map((_, i) => i).sort((a, b) => resultado[b] - resultado[a]);

  for (const i of indicesPorValorDesc) {
    if (Math.abs(residuo) < 0.005) break;
    const novo = arredondar2(resultado[i] + residuo);
    if (novo >= 0) {
      resultado[i] = novo;
      residuo = 0;
      break;
    }
    residuo = arredondar2(residuo + resultado[i]);
    resultado[i] = 0;
  }

  return resultado;
}

export type CriarCampanhaParams = {
  percentualTotal: number;
  periodoInicio: Date;
  periodoFim: Date;
  horarioLancamento: string; // "HH:MM"
  criadoPorId: string;
};

function validarHorario(horario: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(horario);
}

export async function criarCampanhaPlrAutomatica(
  params: CriarCampanhaParams
): Promise<{ error?: string; campanhaId?: string }> {
  const { percentualTotal, periodoInicio, periodoFim, horarioLancamento, criadoPorId } = params;

  if (!percentualTotal || percentualTotal <= 0) return { error: "Informe um percentual total válido." };
  if (periodoFim < periodoInicio) return { error: "A data fim não pode ser antes da data início." };
  if (!validarHorario(horarioLancamento)) return { error: "Informe um horário válido (HH:MM)." };

  const cronograma = gerarCronogramaDiario(percentualTotal, periodoInicio, periodoFim);

  const campanhaId = await prisma.$transaction(async (tx) => {
    // Só uma campanha ativa por vez — qualquer outra em andamento é desativada (os dias dela já
    // processados continuam intactos no histórico; só os pendentes deixam de ser lançados).
    await tx.campanhaPlrAutomatica.updateMany({ where: { ativa: true }, data: { ativa: false } });

    const campanha = await tx.campanhaPlrAutomatica.create({
      data: { percentualTotal, periodoInicio, periodoFim, horarioLancamento, criadoPorId, ativa: true },
    });

    await tx.campanhaPlrDia.createMany({
      data: cronograma.map((d) => ({ campanhaId: campanha.id, data: d.data, percentual: d.percentual })),
    });

    return campanha.id;
  });

  return { campanhaId };
}

export async function desativarCampanhaPlrAutomatica(id: string): Promise<void> {
  await prisma.campanhaPlrAutomatica.update({ where: { id }, data: { ativa: false } });
}

export type CampanhaComDias = {
  id: string;
  percentualTotal: number;
  periodoInicio: Date;
  periodoFim: Date;
  horarioLancamento: string;
  ativa: boolean;
  criadoEm: Date;
  criadoPor: { name: string | null; email: string };
  dias: { id: string; data: Date; percentual: number; processadoEm: Date | null }[];
};

export async function listarCampanhas(): Promise<CampanhaComDias[]> {
  return prisma.campanhaPlrAutomatica.findMany({
    orderBy: { criadoEm: "desc" },
    include: {
      criadoPor: { select: { name: true, email: true } },
      dias: { orderBy: { data: "asc" } },
    },
  });
}

function horaAtualBrasilia(): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

/**
 * Rodada do motor automático — chamada pelo cron (ver api/cron/plr-automatico). Pra cada
 * campanha ativa, materializa (cria a Distribuição de fato, reaproveitando `criarDistribuicao`)
 * todo dia que: já chegou (data <= hoje), o horário configurado da campanha já passou (horário
 * de Brasília) e ainda não foi processado. Idempotente — cada CampanhaPlrDia só é processado uma
 * vez (marca processadoEm/distribuicaoId na mesma operação que cria a Distribuição).
 */
export async function processarDiasPendentes(): Promise<{ processados: number; erros: string[] }> {
  const agora = new Date();
  const horaAtual = horaAtualBrasilia();
  const erros: string[] = [];
  let processados = 0;

  const campanhas = await prisma.campanhaPlrAutomatica.findMany({
    where: { ativa: true },
    include: { dias: { where: { processadoEm: null, data: { lte: agora } } } },
  });

  for (const campanha of campanhas) {
    if (horaAtual < campanha.horarioLancamento) continue;

    for (const dia of campanha.dias) {
      try {
        // Reconfirma direto no banco que ainda não foi processado — proteção best-effort contra
        // o cron rodar em paralelo (a marcação de processadoEm logo abaixo fecha a janela pro
        // resto da rodada; duas rodadas exatamente simultâneas são um risco aceito, igual ao
        // resto do motor de cron desse projeto, que também não usa lock distribuído).
        const atual = await prisma.campanhaPlrDia.findUniqueOrThrow({ where: { id: dia.id } });
        if (atual.processadoEm) continue;

        const dataTexto = dia.data.toISOString().slice(0, 10);
        const { distribuicaoId } = await criarDistribuicao({
          criadoPorId: campanha.criadoPorId,
          periodoInicio: dia.data,
          periodoFim: dia.data,
          percentual: dia.percentual,
          resultadoApurado: `PLR automático — ${dataTexto}`,
        });

        await prisma.campanhaPlrDia.update({
          where: { id: dia.id },
          data: { processadoEm: new Date(), distribuicaoId },
        });
        processados++;
      } catch (err) {
        if (err instanceof SemCapitalElegivelError) {
          // Sem ninguém elegível hoje — marca como processado mesmo assim (não fica tentando
          // de novo a cada rodada do cron pro mesmo dia) e segue pro próximo.
          await prisma.campanhaPlrDia.update({ where: { id: dia.id }, data: { processadoEm: new Date() } });
          continue;
        }
        erros.push(`Campanha ${campanha.id}, dia ${dia.data.toISOString().slice(0, 10)}: ${(err as Error).message}`);
      }
    }
  }

  return { processados, erros };
}
