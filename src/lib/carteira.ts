import { prisma } from "@/lib/prisma";
import { ultimasSextas, inicioDoMesBrasilia } from "@/lib/datas";
import { sincronizarDistribuicoesDoUsuario } from "@/lib/distribuicao";
import type { PontoRendimento } from "@/components/painel/rendimentos-chart";
import type { ResumoFinanceiro } from "@/components/painel/dashboard";
import type { Prisma, TipoCredito } from "@prisma/client";

const NOVENTA_DIAS_MS = 90 * 24 * 60 * 60 * 1000;
const EPSILON = 0.005;

export class SaldoInsuficienteError extends Error {}

export type TxClient = Prisma.TransactionClient;
type LinhaComValor = { id: string; valor: number };

/** Consome linhas em ordem (FIFO) até atingir `valorAlvo`, dividindo a última linha se necessário. */
export async function consumirFIFO<T extends LinhaComValor>(
  linhas: T[],
  valorAlvo: number,
  onTotal: (linha: T) => Promise<void>,
  onParcial: (linha: T, valorConsumido: number, valorRestanteNaLinha: number) => Promise<void>
): Promise<number> {
  let restante = valorAlvo;
  for (const linha of linhas) {
    if (restante <= 0) break;
    if (linha.valor <= restante + EPSILON) {
      await onTotal(linha);
      restante -= linha.valor;
    } else {
      await onParcial(linha, restante, linha.valor - restante);
      restante = 0;
    }
  }
  return restante;
}

export function calcularLiberacao(dataBase: Date = new Date()): Date {
  return new Date(dataBase.getTime() + NOVENTA_DIAS_MS);
}

function sextaDaSemanaDe(data: Date): string {
  const dia = data.getDay();
  const diff = (dia - 5 + 7) % 7;
  const sexta = new Date(data);
  sexta.setHours(0, 0, 0, 0);
  sexta.setDate(data.getDate() - diff);
  return sexta.toISOString().slice(0, 10);
}

export async function getResumoCarteira(userId: string): Promise<ResumoFinanceiro> {
  await prisma.$transaction((tx) => sincronizarDistribuicoesDoUsuario(tx, userId));

  const agora = new Date();

  const [aplicacoes, creditos, saquesAtivos] = await Promise.all([
    prisma.aplicacao.findMany({ where: { userId } }),
    prisma.creditoCarteira.findMany({ where: { userId } }),
    prisma.solicitacaoSaque.findMany({
      where: { userId, status: { in: ["SOLICITADO", "APROVADO"] } },
    }),
  ]);

  let capitalPrincipal = 0;
  let capitalCarencia = 0;
  let capitalDisponivel = 0;
  let valoresReaplicados = 0;
  let aportesEmAnalise = 0;

  for (const ap of aplicacoes) {
    if (ap.status === "AGUARDANDO_APROVACAO") {
      aportesEmAnalise += ap.valor;
      continue;
    }
    if (ap.status === "REJEITADA") continue;

    // Capital conta enquanto não RETIRADA — o saque só debita de fato (RETIRADA) quando o
    // admin aprova (ver aprovarSaque), não só quando é solicitado nem só quando é marcado
    // como pago no final. Antes da aprovação, ainda soma aqui (o "Em processamento"/"Saques
    // pendentes" já mostra o valor reservado separadamente).
    if (ap.status !== "RETIRADA") {
      capitalPrincipal += ap.valor;
      if (ap.status === "CONFIRMADA") {
        if (ap.liberaEm > agora) capitalCarencia += ap.valor;
        else capitalDisponivel += ap.valor;
      }
    }
    if (ap.origem === "REAPLICACAO") valoresReaplicados += ap.valor;
  }

  let distribuicoesAcumuladas = 0;
  let distribuicoesJaSaiu = 0;
  let distribuicoesDisponiveis = 0;
  let bonusIndicacao = 0;

  for (const c of creditos) {
    if (c.tipo === "RENDIMENTO") {
      distribuicoesAcumuladas += c.valor;
      // "Já saiu" (debitado de fato) só quando utilizadoEm é marcado — reaplicação marca na
      // hora; saque de rendimento marca quando o admin aprova (ver aprovarSaque). Só
      // reservado (solicitacaoSaqueId, ainda sem utilizadoEm) continua contando aqui.
      if (c.utilizadoEm) distribuicoesJaSaiu += c.valor;
      if (!c.utilizadoEm && !c.solicitacaoSaqueId) distribuicoesDisponiveis += c.valor;
    } else if (c.tipo === "BONUS") {
      if (!c.utilizadoEm && !c.solicitacaoSaqueId) bonusIndicacao += c.valor;
    }
  }

  const valoresEmProcessamento = saquesAtivos
    .filter((s) => s.status === "SOLICITADO")
    .reduce((acc, s) => acc + s.valor, 0);

  const saquesPendentes = saquesAtivos
    .filter((s) => s.status === "APROVADO")
    .reduce((acc, s) => acc + s.valor, 0);

  const proximaLote = aplicacoes
    .filter((ap) => ap.status === "CONFIRMADA" && ap.liberaEm > agora)
    .sort((a, b) => a.liberaEm.getTime() - b.liberaEm.getTime())[0];

  /** Rentabilidade do período (mês corrente, horário de Brasília) — soma o que foi creditado
   *  por Distribuição (diluída dia a dia) ou PLR Individual (creditado na hora). Automático:
   *  não depende de qual dos dois lançou o crédito. Fica de fora migração de saldo e ajuste
   *  manual do admin, que não são baseados em percentual e distorceriam o número. */
  const inicioMes = inicioDoMesBrasilia();
  const creditadoNoMes = creditos
    .filter(
      (c) =>
        c.tipo === "RENDIMENTO" &&
        c.criadoEm >= inicioMes &&
        (c.origem.startsWith("PLR manual") || c.origem.startsWith("Distribuição "))
    )
    .reduce((acc, c) => acc + c.valor, 0);
  const rentabilidadePeriodo = capitalPrincipal > 0 ? (creditadoNoMes / capitalPrincipal) * 100 : 0;

  const sextas = ultimasSextas(8);
  const totaisPorSemana = new Map<string, number>();
  for (const c of creditos) {
    if (c.tipo !== "RENDIMENTO") continue;
    const chave = sextaDaSemanaDe(c.criadoEm);
    totaisPorSemana.set(chave, (totaisPorSemana.get(chave) ?? 0) + c.valor);
  }
  const historicoRendimentos: PontoRendimento[] = sextas.map((data) => ({
    data,
    valor: totaisPorSemana.get(data.toISOString().slice(0, 10)) ?? 0,
  }));

  // Uma vez reaplicado ou sacado (aprovado), o valor sai da carteira de rendimento — não faz
  // sentido continuar contando como "Rendimentos" também, senão o mesmo dinheiro aparece
  // creditado em duas caixinhas ao mesmo tempo.
  const distribuicoesAcumuladasLiquido = Math.max(0, distribuicoesAcumuladas - distribuicoesJaSaiu);

  return {
    capitalPrincipal,
    capitalCarencia,
    capitalDisponivel,
    distribuicoesAcumuladas: distribuicoesAcumuladasLiquido,
    distribuicoesDisponiveis,
    bonusIndicacao,
    valoresReaplicados,
    valoresEmProcessamento,
    saquesPendentes,
    aportesEmAnalise,
    totalDoacoes: 0,
    rentabilidadePeriodo,
    proximaLiberacao: proximaLote?.liberaEm ?? null,
    historicoRendimentos,
  };
}

/**
 * Reserva lotes de capital liberado (fora de carência) para uma solicitação de saque,
 * dividindo lotes quando necessário. Deve ser chamada dentro de uma transação já aberta
 * pelo chamador (não abre transação própria, para evitar transações aninhadas).
 */
export async function reservarCapitalParaSaque(
  tx: TxClient,
  userId: string,
  valor: number,
  solicitacaoSaqueId: string
): Promise<void> {
  const disponiveis = await tx.aplicacao.findMany({
    where: { userId, status: "CONFIRMADA", liberaEm: { lte: new Date() } },
    orderBy: { criadoEm: "asc" },
  });

  const restante = await consumirFIFO(
    disponiveis,
    valor,
    async (lote) => {
      await tx.aplicacao.update({
        where: { id: lote.id },
        data: { status: "SAQUE_SOLICITADO", solicitacaoSaqueId },
      });
    },
    async (lote, valorConsumido, valorRestanteNaLinha) => {
      const cheio = await tx.aplicacao.findUniqueOrThrow({ where: { id: lote.id } });
      await tx.aplicacao.update({
        where: { id: lote.id },
        data: { valor: valorRestanteNaLinha },
      });
      await tx.aplicacao.create({
        data: {
          userId,
          valor: valorConsumido,
          moeda: cheio.moeda,
          origem: cheio.origem,
          status: "SAQUE_SOLICITADO",
          criadoEm: cheio.criadoEm,
          liberaEm: cheio.liberaEm,
          solicitacaoSaqueId,
        },
      });
    }
  );

  if (restante > EPSILON) {
    throw new SaldoInsuficienteError("Saldo disponível insuficiente para este saque.");
  }
}

/**
 * Reserva créditos (rendimento) disponíveis para uma solicitação de saque, dividindo quando
 * necessário. Deve ser chamada dentro de uma transação já aberta pelo chamador.
 */
export async function reservarCreditosParaSaque(
  tx: TxClient,
  userId: string,
  valor: number,
  tipo: TipoCredito,
  solicitacaoSaqueId: string
): Promise<void> {
  const disponiveis = await tx.creditoCarteira.findMany({
    where: { userId, tipo, utilizadoEm: null, solicitacaoSaqueId: null },
    orderBy: { criadoEm: "asc" },
  });

  const restante = await consumirFIFO(
    disponiveis,
    valor,
    async (credito) => {
      await tx.creditoCarteira.update({
        where: { id: credito.id },
        data: { solicitacaoSaqueId },
      });
    },
    async (credito, valorConsumido, valorRestanteNaLinha) => {
      const cheio = await tx.creditoCarteira.findUniqueOrThrow({ where: { id: credito.id } });
      await tx.creditoCarteira.update({
        where: { id: credito.id },
        data: { valor: valorRestanteNaLinha },
      });
      await tx.creditoCarteira.create({
        data: {
          userId,
          tipo,
          valor: valorConsumido,
          moeda: cheio.moeda,
          origem: cheio.origem,
          criadoEm: cheio.criadoEm,
          solicitacaoSaqueId,
        },
      });
    }
  );

  if (restante > EPSILON) {
    throw new SaldoInsuficienteError("Saldo disponível insuficiente para este saque.");
  }
}

/**
 * Consome rendimento + bônus disponíveis (nessa ordem) e cria uma nova aplicação (novo lote,
 * nova carência). Deve ser chamada dentro de uma transação já aberta pelo chamador.
 */
export async function reaplicarSaldoDisponivel(
  tx: TxClient,
  userId: string,
  valor: number
): Promise<void> {
  const disponiveis = await tx.creditoCarteira.findMany({
    where: { userId, utilizadoEm: null, solicitacaoSaqueId: null },
    orderBy: [{ tipo: "desc" }, { criadoEm: "asc" }], // RENDIMENTO antes de BONUS
  });

  const restante = await consumirFIFO(
    disponiveis,
    valor,
    async (credito) => {
      await tx.creditoCarteira.update({
        where: { id: credito.id },
        data: { utilizadoEm: new Date() },
      });
    },
    async (credito, _valorConsumido, valorRestanteNaLinha) => {
      const cheio = await tx.creditoCarteira.findUniqueOrThrow({ where: { id: credito.id } });
      await tx.creditoCarteira.update({
        where: { id: credito.id },
        data: { valor: valorRestanteNaLinha },
      });
      await tx.creditoCarteira.create({
        data: {
          userId,
          tipo: cheio.tipo,
          valor: cheio.valor - valorRestanteNaLinha,
          moeda: cheio.moeda,
          origem: cheio.origem,
          utilizadoEm: new Date(),
        },
      });
    }
  );

  if (restante > EPSILON) {
    throw new SaldoInsuficienteError("Saldo disponível insuficiente para reaplicação.");
  }

  await tx.aplicacao.create({
    data: {
      userId,
      valor,
      moeda: "BRL",
      origem: "REAPLICACAO",
      status: "CONFIRMADA",
      liberaEm: calcularLiberacao(),
    },
  });
}
