import { prisma } from "@/lib/prisma";
import { formatMoeda } from "@/lib/format";
import { consumirFIFO, calcularLiberacao, SaldoInsuficienteError, type TxClient } from "@/lib/carteira";
import { getConfiguracao } from "@/lib/configuracao";

/** Incentivo de liderança fica guardado como CreditoCarteira tipo RENDIMENTO (soma normalmente
 *  em rendimento disponível, saque, reaplicação...), diferenciado só pelo prefixo da origem —
 *  mesmo padrão já usado pra "PLR manual" e "Distribuição". Isso evita duplicar toda a
 *  infraestrutura de saque/reaplicação/histórico só pra esse tipo de crédito. */
export const ORIGEM_INCENTIVO_PREFIXO = "Incentivo de liderança";
const ORIGEM_AJUSTE_ADMIN = "Incentivo de liderança (ajuste admin)";
const EPSILON = 0.005;

export async function saldoIncentivoLiderancaDisponivel(userId: string): Promise<number> {
  const linhas = await prisma.creditoCarteira.findMany({
    where: {
      userId,
      tipo: "RENDIMENTO",
      utilizadoEm: null,
      solicitacaoSaqueId: null,
      origem: { startsWith: ORIGEM_INCENTIVO_PREFIXO },
    },
  });
  return linhas.reduce((acc, l) => acc + l.valor, 0);
}

export async function adicionarIncentivoLideranca(userId: string, valor: number): Promise<void> {
  await prisma.creditoCarteira.create({
    data: { userId, tipo: "RENDIMENTO", valor, moeda: "BRL", origem: ORIGEM_AJUSTE_ADMIN },
  });
}

/** Reduz o incentivo de liderança ainda livre (não usado nem reservado num saque), consumindo
 *  os lançamentos mais antigos primeiro e apagando os que zerarem. */
async function reduzirIncentivoLideranca(userId: string, valorReduzir: number): Promise<string | null> {
  const linhas = await prisma.creditoCarteira.findMany({
    where: {
      userId,
      tipo: "RENDIMENTO",
      utilizadoEm: null,
      solicitacaoSaqueId: null,
      origem: { startsWith: ORIGEM_INCENTIVO_PREFIXO },
    },
    orderBy: { criadoEm: "asc" },
  });

  let restante = valorReduzir;
  for (const linha of linhas) {
    if (restante <= EPSILON) break;
    if (linha.valor <= restante + EPSILON) {
      await prisma.creditoCarteira.delete({ where: { id: linha.id } });
      restante -= linha.valor;
    } else {
      await prisma.creditoCarteira.update({ where: { id: linha.id }, data: { valor: linha.valor - restante } });
      restante = 0;
    }
  }

  if (restante > EPSILON) {
    return `Só é possível reduzir até o incentivo de liderança ainda livre (não usado nem reservado num saque). Faltou reduzir ${formatMoeda(restante)}.`;
  }
  return null;
}

/** Ajusta o incentivo de liderança disponível pro valor exato informado — pode aumentar ou
 *  diminuir, igual ao "Definir" do ajuste de saldo normal. */
export async function definirIncentivoLideranca(userId: string, valor: number): Promise<string | null> {
  const atual = await saldoIncentivoLiderancaDisponivel(userId);
  const delta = valor - atual;

  if (delta > EPSILON) {
    await adicionarIncentivoLideranca(userId, delta);
  } else if (delta < -EPSILON) {
    return await reduzirIncentivoLideranca(userId, -delta);
  }
  return null;
}

export async function zerarIncentivoLideranca(userId: string): Promise<string | null> {
  return definirIncentivoLideranca(userId, 0);
}

/** Reserva incentivo de liderança disponível pra uma solicitação de saque — mesmo padrão de
 *  reservarCreditosParaSaque, só filtrado pela origem do incentivo em vez do tipo puro. */
export async function reservarIncentivoLiderancaParaSaque(
  tx: TxClient,
  userId: string,
  valor: number,
  solicitacaoSaqueId: string
): Promise<void> {
  const disponiveis = await tx.creditoCarteira.findMany({
    where: {
      userId,
      tipo: "RENDIMENTO",
      utilizadoEm: null,
      solicitacaoSaqueId: null,
      origem: { startsWith: ORIGEM_INCENTIVO_PREFIXO },
    },
    orderBy: { criadoEm: "asc" },
  });

  const restante = await consumirFIFO(
    disponiveis,
    valor,
    async (credito) => {
      await tx.creditoCarteira.update({ where: { id: credito.id }, data: { solicitacaoSaqueId } });
    },
    async (credito, _valorConsumido, valorRestanteNaLinha) => {
      const cheio = await tx.creditoCarteira.findUniqueOrThrow({ where: { id: credito.id } });
      await tx.creditoCarteira.update({ where: { id: credito.id }, data: { valor: valorRestanteNaLinha } });
      await tx.creditoCarteira.create({
        data: {
          userId,
          tipo: "RENDIMENTO",
          valor: cheio.valor - valorRestanteNaLinha,
          moeda: cheio.moeda,
          origem: cheio.origem,
          criadoEm: cheio.criadoEm,
          solicitacaoSaqueId,
        },
      });
    }
  );

  if (restante > 0.005) {
    throw new SaldoInsuficienteError("Incentivo de liderança disponível insuficiente para este saque.");
  }
}

export type FonteReaplicacao = "PLR" | "INCENTIVO_LIDERANCA" | "BONUS";

const LABEL_FONTE: Record<FonteReaplicacao, string> = {
  PLR: "Rendimento/PLR",
  INCENTIVO_LIDERANCA: "Incentivo de liderança",
  BONUS: "Bônus de indicação",
};

/** Reaplica valores escolhidos pelo próprio investidor, fonte por fonte (PLR, incentivo de
 *  liderança e/ou bônus) — total ou parcial de cada uma, ao contrário de `reaplicarSaldoDisponivel`
 *  (lib/carteira.ts), que sempre consome tudo misturado numa fila só. Cria um único novo lote
 *  (Aplicacao) com a soma de tudo, com a carência normal de 90 dias. */
export async function reaplicarSaldoPorFonte(
  tx: TxClient,
  userId: string,
  itens: { fonte: FonteReaplicacao; valor: number }[]
): Promise<void> {
  let totalReaplicado = 0;
  // Linhas consumidas por inteiro vão num único updateMany no fim (um UPDATE por linha estourava o
  // tempo da transação em contas com dezenas de créditos diários).
  const idsConsumidos: string[] = [];

  for (const item of itens) {
    if (item.valor <= EPSILON) continue;
    totalReaplicado += item.valor;

    const where =
      item.fonte === "BONUS"
        ? { userId, tipo: "BONUS" as const, utilizadoEm: null, solicitacaoSaqueId: null }
        : item.fonte === "INCENTIVO_LIDERANCA"
          ? {
              userId,
              tipo: "RENDIMENTO" as const,
              utilizadoEm: null,
              solicitacaoSaqueId: null,
              origem: { startsWith: ORIGEM_INCENTIVO_PREFIXO },
            }
          : {
              userId,
              tipo: "RENDIMENTO" as const,
              utilizadoEm: null,
              solicitacaoSaqueId: null,
              NOT: { origem: { startsWith: ORIGEM_INCENTIVO_PREFIXO } },
            };

    const disponiveis = await tx.creditoCarteira.findMany({ where, orderBy: { criadoEm: "asc" } });

    const restante = await consumirFIFO(
      disponiveis,
      item.valor,
      async (credito) => {
        idsConsumidos.push(credito.id);
      },
      async (credito, _valorConsumido, valorRestanteNaLinha) => {
        const cheio = await tx.creditoCarteira.findUniqueOrThrow({ where: { id: credito.id } });
        await tx.creditoCarteira.update({ where: { id: credito.id }, data: { valor: valorRestanteNaLinha } });
        await tx.creditoCarteira.create({
          data: {
            userId,
            tipo: cheio.tipo,
            valor: cheio.valor - valorRestanteNaLinha,
            moeda: cheio.moeda,
            origem: cheio.origem,
            criadoEm: cheio.criadoEm,
            utilizadoEm: new Date(),
          },
        });
      }
    );

    if (restante > EPSILON) {
      throw new SaldoInsuficienteError(
        `Saldo de ${LABEL_FONTE[item.fonte]} insuficiente para reaplicação.`
      );
    }
  }

  if (totalReaplicado <= EPSILON) {
    throw new SaldoInsuficienteError("Informe pelo menos um valor pra reaplicar.");
  }

  if (idsConsumidos.length > 0) {
    await tx.creditoCarteira.updateMany({
      where: { id: { in: idsConsumidos } },
      data: { utilizadoEm: new Date() },
    });
  }

  await tx.aplicacao.create({
    data: {
      userId,
      valor: totalReaplicado,
      moeda: "BRL",
      origem: "REAPLICACAO",
      status: "CONFIRMADA",
      liberaEm: calcularLiberacao(),
    },
  });
}

export type FonteSaqueRendimento = "PLR" | "INCENTIVO_LIDERANCA";

const LABEL_FONTE_SAQUE: Record<FonteSaqueRendimento, string> = {
  PLR: "Rendimento/PLR",
  INCENTIVO_LIDERANCA: "Incentivo de liderança",
};

/** Reserva rendimento disponível pra um saque, fonte por fonte (PLR e/ou incentivo de
 *  liderança) — total ou parcial de cada uma, ao contrário de `reservarCreditosParaSaque`
 *  (lib/carteira.ts), que consome tudo misturado numa fila só. Cria uma única solicitação de
 *  saque (o valor total já foi somado pelo chamador). Deve ser chamada dentro de uma
 *  transação já aberta pelo chamador. */
export async function reservarSaqueRendimentoPorFonte(
  tx: TxClient,
  userId: string,
  itens: { fonte: FonteSaqueRendimento; valor: number }[],
  solicitacaoSaqueId: string
): Promise<void> {
  for (const item of itens) {
    if (item.valor <= EPSILON) continue;

    const where =
      item.fonte === "INCENTIVO_LIDERANCA"
        ? {
            userId,
            tipo: "RENDIMENTO" as const,
            utilizadoEm: null,
            solicitacaoSaqueId: null,
            origem: { startsWith: ORIGEM_INCENTIVO_PREFIXO },
          }
        : {
            userId,
            tipo: "RENDIMENTO" as const,
            utilizadoEm: null,
            solicitacaoSaqueId: null,
            NOT: { origem: { startsWith: ORIGEM_INCENTIVO_PREFIXO } },
          };

    const disponiveis = await tx.creditoCarteira.findMany({ where, orderBy: { criadoEm: "asc" } });

    const restante = await consumirFIFO(
      disponiveis,
      item.valor,
      async (credito) => {
        await tx.creditoCarteira.update({ where: { id: credito.id }, data: { solicitacaoSaqueId } });
      },
      async (credito, _valorConsumido, valorRestanteNaLinha) => {
        const cheio = await tx.creditoCarteira.findUniqueOrThrow({ where: { id: credito.id } });
        await tx.creditoCarteira.update({ where: { id: credito.id }, data: { valor: valorRestanteNaLinha } });
        await tx.creditoCarteira.create({
          data: {
            userId,
            tipo: cheio.tipo,
            valor: cheio.valor - valorRestanteNaLinha,
            moeda: cheio.moeda,
            origem: cheio.origem,
            criadoEm: cheio.criadoEm,
            solicitacaoSaqueId,
          },
        });
      }
    );

    if (restante > EPSILON) {
      throw new SaldoInsuficienteError(
        `Saldo de ${LABEL_FONTE_SAQUE[item.fonte]} insuficiente para este saque.`
      );
    }
  }
}

export type ResultadoLiberacao = { creditados: number; total: number };

/** Libera um percentual de incentivo de liderança pra TODOS os líderes de uma vez — percentual
 *  aplicado sobre o capital de cada um. Reaproveitada tanto pelo botão manual do admin quanto
 *  pelo cron automático (ver /api/cron/liberar-incentivo-lideranca), pra nunca duplicar a
 *  lógica entre os dois caminhos. */
export async function liberarIncentivoParaTodosLideres(
  percentual: number,
  criadoEm: Date,
  origemSufixo: string
): Promise<ResultadoLiberacao> {
  const lideres = await prisma.user.findMany({ where: { perfil: "LIDER" }, select: { id: true } });
  const liderIds = lideres.map((l) => l.id);
  if (liderIds.length === 0) return { creditados: 0, total: 0 };

  // USDT fica de fora — saldo separado do capital em R$, sem regra própria de incentivo ainda.
  const capitaisPorLider = await prisma.aplicacao.groupBy({
    by: ["userId"],
    where: { userId: { in: liderIds }, status: { in: ["CONFIRMADA", "SAQUE_SOLICITADO"] }, moeda: { not: "USDT" } },
    _sum: { valor: true },
  });
  const capitalPorId = new Map(capitaisPorLider.map((c) => [c.userId, c._sum.valor ?? 0]));

  const origem = `${ORIGEM_INCENTIVO_PREFIXO} ${percentual}%${origemSufixo}`;

  const creditos = liderIds
    .map((userId) => ({ userId, valor: (capitalPorId.get(userId) ?? 0) * (percentual / 100) }))
    .filter((c) => c.valor > 0);

  const total = creditos.reduce((acc, c) => acc + c.valor, 0);

  if (creditos.length > 0) {
    await prisma.creditoCarteira.createMany({
      data: creditos.map((c) => ({
        userId: c.userId,
        tipo: "RENDIMENTO",
        valor: c.valor,
        moeda: "BRL",
        origem,
        criadoEm,
      })),
    });
  }

  return { creditados: creditos.length, total };
}

export const PERCENTUAL_INCENTIVO_AUTOMATICO = 0.1;
const ORIGEM_INCENTIVO_AUTOMATICO = `${ORIGEM_INCENTIVO_PREFIXO} ${PERCENTUAL_INCENTIVO_AUTOMATICO}% (automático)`;

function hojeBrasiliaStr(dataBase: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(dataBase);
}

/** Dia da semana e hora em Brasília, sem depender do timezone do servidor (o Vercel roda em
 *  UTC, mas isso funciona em qualquer timezone). 0 = domingo … 6 = sábado. */
function agoraBrasilia(): { diaSemana: number; hora: number } {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const diasSemana: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const diaTexto = partes.find((p) => p.type === "weekday")?.value ?? "Sun";
  const horaTexto = partes.find((p) => p.type === "hour")?.value ?? "0";
  return { diaSemana: diasSemana[diaTexto] ?? 0, hora: parseInt(horaTexto, 10) };
}

export type ResultadoLiberacaoAutomatica = ResultadoLiberacao & { pulou?: string };

/** Erro de violação de índice único do Prisma (P2002) — mesmo helper usado em painel/actions.ts
 *  pra detectar quando duas chamadas concorrentes colidem numa reivindicação por unicidade. */
function ehViolacaoDeUnicidade(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002";
}

/** Dia útil (segunda a sexta) de uma data `YYYY-MM-DD` — sem feriados, igual à regra do cron. */
function ehDiaUtilStr(diaStr: string): boolean {
  const d = new Date(`${diaStr}T12:00:00-03:00`).getUTCDay();
  return d !== 0 && d !== 6;
}

/** Quantos dias úteis pra trás o catch-up olha, no máximo — limita o trabalho de cada chamada. */
const DIAS_MAX_CATCHUP = 7;

/** Primeiro dia (Brasília) em que o catch-up automático passa a valer. Dias úteis anteriores sem
 *  incentivo (06/10, 09/10, 12/10 e 16/10/2026) NÃO são creditados sozinhos por esse caminho: foram
 *  perdas já identificadas e só entram por um lançamento retroativo explicitamente confirmado
 *  (ver liberarIncentivoDoDia, exportada pra isso). */
export const CATCHUP_INCENTIVO_A_PARTIR_DE = "2026-10-19";

/** Dias úteis ANTERIORES a `hoje` (`YYYY-MM-DD`, Brasília) que o catch-up deve conferir: até `max`
 *  dias pra trás e nunca antes de `aPartirDe`, do mais antigo pro mais recente. */
export function diasUteisParaCatchup(hoje: string, aPartirDe: string, max: number): string[] {
  const dias: string[] = [];
  for (let atras = max; atras >= 1; atras--) {
    const diaStr = hojeBrasiliaStr(new Date(new Date(`${hoje}T12:00:00-03:00`).getTime() - atras * 24 * 60 * 60 * 1000));
    if (diaStr >= aPartirDe && ehDiaUtilStr(diaStr)) dias.push(diaStr);
  }
  return dias;
}

/**
 * Libera o incentivo automático de UM dia útil específico (`diaStr`, em Brasília) pra todos os
 * líderes — idempotente: quem garante que só uma liberação aconteça por dia é a reivindicação
 * atômica em LiberacaoIncentivoDiaria (`dia` é único; a 2ª chamada, concorrente ou não, recebe
 * P2002 e desiste sem duplicar). Os créditos levam a data/hora das 19h daquele dia (quando o cron
 * normal teria rodado), pra o extrato mostrar o dia certo mesmo num lançamento atrasado. O valor
 * é 0,10% do capital que cada líder tem NO MOMENTO da liberação (não dá pra reconstruir o capital
 * de dias passados).
 */
export async function liberarIncentivoDoDia(diaStr: string): Promise<ResultadoLiberacaoAutomatica> {
  const inicioDoDia = new Date(`${diaStr}T00:00:00-03:00`);
  const fimDoDia = new Date(`${diaStr}T23:59:59.999-03:00`);

  // Atalho barato (evita tocar o marcador na maioria das chamadas, depois que o dia já foi
  // liberado) — o marcador único abaixo é que garante de verdade.
  const jaRodou = await prisma.creditoCarteira.findFirst({
    where: { origem: { startsWith: ORIGEM_INCENTIVO_AUTOMATICO }, criadoEm: { gte: inicioDoDia, lte: fimDoDia } },
  });
  if (jaRodou) return { creditados: 0, total: 0, pulou: "já liberado nesse dia" };

  try {
    await prisma.liberacaoIncentivoDiaria.create({ data: { dia: inicioDoDia } });
  } catch (err) {
    if (ehViolacaoDeUnicidade(err)) {
      return { creditados: 0, total: 0, pulou: "já liberado nesse dia (reivindicado por outra chamada)" };
    }
    throw err;
  }

  let resultado: ResultadoLiberacao;
  try {
    resultado = await liberarIncentivoParaTodosLideres(
      PERCENTUAL_INCENTIVO_AUTOMATICO,
      new Date(`${diaStr}T19:00:00-03:00`),
      " (automático)"
    );
  } catch (err) {
    // Falhou depois de reivindicar o dia — desfaz a reivindicação pra poder tentar de novo na
    // próxima chamada, em vez de deixar o dia marcado como "feito" sem nenhum crédito real.
    await prisma.liberacaoIncentivoDiaria.deleteMany({ where: { dia: inicioDoDia } });
    throw err;
  }

  await prisma.logAuditoria.create({
    data: {
      acao: "liberar_incentivo_lideranca_automatico",
      detalhes: `${PERCENTUAL_INCENTIVO_AUTOMATICO}% para ${resultado.creditados} líder(es), total ${resultado.total.toFixed(2)} (dia ${diaStr})`,
    },
  });

  return resultado;
}

/**
 * Libera o incentivo automático pra todos os líderes: o de hoje (dia útil, depois das 19h de
 * Brasília) E o de qualquer dia útil anterior que tenha ficado sem liberação (catch-up).
 *
 * Existe como fallback de qualquer página carregada pelo admin e também roda no cron
 * (/api/cron/liberar-incentivo-lideranca), porque um cron que falha em silêncio não pode ser a
 * ÚNICA forma do incentivo funcionar — e, antes do catch-up, um dia em que o cron falhasse e
 * ninguém abrisse o painel de admin depois das 19h ficava sem incentivo PRA SEMPRE (aconteceu em
 * 06/10, 09/10, 12/10 e 16/10/2026: nenhum líder recebeu os 0,10% desses dias). Agora, na próxima
 * chamada (mesmo num fim de semana ou de manhã), o dia perdido é liberado.
 */
export async function liberarIncentivoAutomaticoSeNecessario(): Promise<ResultadoLiberacaoAutomatica> {
  const config = await getConfiguracao();
  if (config.modoIncentivoLideranca !== "AUTOMATICO") {
    return { creditados: 0, total: 0, pulou: "modo manual" };
  }

  const hoje = hojeBrasiliaStr();

  // Dias úteis anteriores perdidos, do mais antigo pro mais recente.
  let creditadosAtrasados = 0;
  let totalAtrasados = 0;
  for (const diaStr of diasUteisParaCatchup(hoje, CATCHUP_INCENTIVO_A_PARTIR_DE, DIAS_MAX_CATCHUP)) {
    const r = await liberarIncentivoDoDia(diaStr);
    creditadosAtrasados += r.creditados;
    totalAtrasados += r.total;
  }

  const { diaSemana, hora } = agoraBrasilia();
  if (diaSemana === 0 || diaSemana === 6) {
    return { creditados: creditadosAtrasados, total: totalAtrasados, pulou: "fim de semana" };
  }
  if (hora < 19) {
    return { creditados: creditadosAtrasados, total: totalAtrasados, pulou: "ainda não são 19h em Brasília" };
  }

  const r = await liberarIncentivoDoDia(hoje);
  return { ...r, creditados: r.creditados + creditadosAtrasados, total: r.total + totalAtrasados };
}

export type LiderResumo = {
  id: string;
  nome: string;
  email: string;
  capital: number;
  incentivoAcumulado: number;
  incentivoDisponivel: number;
  desde: Date;
};

export async function listarLideres(): Promise<LiderResumo[]> {
  const lideres = await prisma.user.findMany({
    where: { perfil: "LIDER" },
    include: { pessoaFisica: true, pessoaJuridica: true },
    orderBy: { createdAt: "desc" },
  });
  if (lideres.length === 0) return [];

  const ids = lideres.map((l) => l.id);
  const [capitais, creditos] = await Promise.all([
    prisma.aplicacao.groupBy({
      by: ["userId"],
      where: { userId: { in: ids }, status: { in: ["CONFIRMADA", "SAQUE_SOLICITADO"] }, moeda: { not: "USDT" } },
      _sum: { valor: true },
    }),
    prisma.creditoCarteira.findMany({
      where: { userId: { in: ids }, tipo: "RENDIMENTO", origem: { startsWith: ORIGEM_INCENTIVO_PREFIXO } },
    }),
  ]);

  const capitalPorId = new Map(capitais.map((c) => [c.userId, c._sum.valor ?? 0]));
  const acumuladoPorId = new Map<string, number>();
  const disponivelPorId = new Map<string, number>();
  for (const c of creditos) {
    acumuladoPorId.set(c.userId, (acumuladoPorId.get(c.userId) ?? 0) + c.valor);
    if (!c.utilizadoEm && !c.solicitacaoSaqueId) {
      disponivelPorId.set(c.userId, (disponivelPorId.get(c.userId) ?? 0) + c.valor);
    }
  }

  return lideres.map((l) => ({
    id: l.id,
    nome: l.pessoaFisica?.nomeCompleto ?? l.pessoaJuridica?.razaoSocial ?? l.name ?? l.email,
    email: l.email,
    capital: capitalPorId.get(l.id) ?? 0,
    incentivoAcumulado: acumuladoPorId.get(l.id) ?? 0,
    incentivoDisponivel: disponivelPorId.get(l.id) ?? 0,
    desde: l.createdAt,
  }));
}
