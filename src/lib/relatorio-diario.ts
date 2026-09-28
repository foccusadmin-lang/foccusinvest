import { prisma } from "@/lib/prisma";
import { getResumoCarteira } from "@/lib/carteira";
import { limitesDoDiaBrasilia } from "@/lib/datas";
import { formatMoeda } from "@/lib/format";
import { enviarMensagemTelegram } from "@/lib/telegram";

const EMAIL_ADMINISTRADORA = "foccusadmin@gmail.com";
const PREFIXO_TAXA_CARENCIA = "Taxa de saque de carência";

export type RelatorioDiario = {
  data: Date;
  aportesConfirmadosBRL: { total: number; quantidade: number };
  aportesConfirmadosUSDT: { total: number; quantidade: number };
  aportesEmAnaliseBRL: { total: number; quantidade: number };
  saquesPagos: { capital: number; rendimento: number; bonus: number; quantidade: number };
  saquesSolicitadosHoje: { total: number; quantidade: number };
  saquesPendentes: { total: number; quantidade: number };
  taxaCarenciaRetidaHoje: number;
  receitaServicosHoje: number;
  rendimentoLancadoHoje: number;
  novosCadastros: number;
  capitalTotalAtivo: number;
  saldoFundoCaixa: number;
};

/** Monta os números do dia (Brasília) pro relatório financeiro do admin — mesma base de dados
 *  já usada em restrito/painel, restrito/fundo-caixa e restrito/saques, só reagrupada por data. */
export async function calcularRelatorioDiario(agora: Date = new Date()): Promise<RelatorioDiario> {
  const { inicio, fim } = limitesDoDiaBrasilia(agora);

  const administradora = await prisma.user.findFirst({ where: { email: EMAIL_ADMINISTRADORA } });

  const [
    aportesConfirmados,
    aportesEmAnalise,
    saquesPagosHoje,
    saquesSolicitadosHoje,
    saquesPendentes,
    creditosRendimentoHoje,
    receitaServicos,
    novosCadastros,
    capitalTotal,
  ] = await Promise.all([
    prisma.aplicacao.findMany({
      where: { status: "CONFIRMADA", aprovadoEm: { gte: inicio, lte: fim } },
      select: { valor: true, moeda: true },
    }),
    prisma.aplicacao.aggregate({
      where: { status: "AGUARDANDO_APROVACAO", criadoEm: { gte: inicio, lte: fim }, moeda: { not: "USDT" } },
      _sum: { valor: true },
      _count: true,
    }),
    prisma.solicitacaoSaque.findMany({
      where: { status: "PAGO", pagoEm: { gte: inicio, lte: fim } },
      select: { tipo: true, valor: true },
    }),
    prisma.solicitacaoSaque.aggregate({
      where: { criadoEm: { gte: inicio, lte: fim } },
      _sum: { valor: true },
      _count: true,
    }),
    prisma.solicitacaoSaque.aggregate({
      where: { status: { in: ["SOLICITADO", "AGUARDANDO_PAGAMENTO"] } },
      _sum: { valor: true },
      _count: true,
    }),
    prisma.creditoCarteira.findMany({
      where: { tipo: "RENDIMENTO", criadoEm: { gte: inicio, lte: fim } },
      select: { valor: true, origem: true, userId: true },
    }),
    prisma.cobrancaServico.aggregate({
      where: { criadoEm: { gte: inicio, lte: fim } },
      _sum: { valorFinal: true },
    }),
    prisma.user.count({ where: { createdAt: { gte: inicio, lte: fim } } }),
    prisma.aplicacao.aggregate({
      where: { status: { in: ["CONFIRMADA", "SAQUE_SOLICITADO"] }, moeda: { not: "USDT" } },
      _sum: { valor: true },
    }),
  ]);

  const aportesConfirmadosBRL = aportesConfirmados.filter((a) => a.moeda !== "USDT");
  const aportesConfirmadosUSDT = aportesConfirmados.filter((a) => a.moeda === "USDT");

  const saquesPagos = saquesPagosHoje.reduce(
    (acc, s) => {
      if (s.tipo === "CAPITAL") acc.capital += s.valor;
      else if (s.tipo === "RENDIMENTO") acc.rendimento += s.valor;
      else acc.bonus += s.valor;
      acc.quantidade += 1;
      return acc;
    },
    { capital: 0, rendimento: 0, bonus: 0, quantidade: 0 }
  );

  const taxaCarenciaRetidaHoje = administradora
    ? creditosRendimentoHoje
        .filter((c) => c.userId === administradora.id && c.origem.startsWith(PREFIXO_TAXA_CARENCIA))
        .reduce((acc, c) => acc + c.valor, 0)
    : 0;

  // PLR/rendimento de verdade pros investidores — exclui a própria conta da administradora
  // (aquilo ali é receita/fundo de caixa, não distribuição).
  const rendimentoLancadoHoje = creditosRendimentoHoje
    .filter((c) => !administradora || c.userId !== administradora.id)
    .reduce((acc, c) => acc + c.valor, 0);

  const saldoFundoCaixa = administradora
    ? await getResumoCarteira(administradora.id).then(
        (r) => r.capitalPrincipal + r.distribuicoesDisponiveis + r.bonusIndicacao
      )
    : 0;

  return {
    data: inicio,
    aportesConfirmadosBRL: {
      total: aportesConfirmadosBRL.reduce((a, c) => a + c.valor, 0),
      quantidade: aportesConfirmadosBRL.length,
    },
    aportesConfirmadosUSDT: {
      total: aportesConfirmadosUSDT.reduce((a, c) => a + c.valor, 0),
      quantidade: aportesConfirmadosUSDT.length,
    },
    aportesEmAnaliseBRL: { total: aportesEmAnalise._sum.valor ?? 0, quantidade: aportesEmAnalise._count },
    saquesPagos,
    saquesSolicitadosHoje: {
      total: saquesSolicitadosHoje._sum.valor ?? 0,
      quantidade: saquesSolicitadosHoje._count,
    },
    saquesPendentes: { total: saquesPendentes._sum.valor ?? 0, quantidade: saquesPendentes._count },
    taxaCarenciaRetidaHoje,
    receitaServicosHoje: receitaServicos._sum.valorFinal ?? 0,
    rendimentoLancadoHoje,
    novosCadastros,
    capitalTotalAtivo: capitalTotal._sum.valor ?? 0,
    saldoFundoCaixa,
  };
}

function dataBRExtenso(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" }).format(data);
}

/** Texto pronto pro Telegram (HTML simples: negrito só). */
export function formatarRelatorioDiario(r: RelatorioDiario): string {
  const linhas = [
    `<b>📊 Foccus Invest — relatório de ${dataBRExtenso(r.data)}</b>`,
    ``,
    `<b>Entradas</b>`,
    `Aportes confirmados (R$): ${formatMoeda(r.aportesConfirmadosBRL.total)} (${r.aportesConfirmadosBRL.quantidade})`,
  ];
  if (r.aportesConfirmadosUSDT.quantidade > 0) {
    linhas.push(`Aportes confirmados (USDT): ${r.aportesConfirmadosUSDT.total.toFixed(2)} (${r.aportesConfirmadosUSDT.quantidade})`);
  }
  linhas.push(
    `Aportes aguardando aprovação: ${formatMoeda(r.aportesEmAnaliseBRL.total)} (${r.aportesEmAnaliseBRL.quantidade})`,
    `Receita de Pacotes de Serviços: ${formatMoeda(r.receitaServicosHoje)}`,
    `Taxa de saque de carência retida: ${formatMoeda(r.taxaCarenciaRetidaHoje)}`,
    ``,
    `<b>Saídas</b>`,
    `Saques pagos — capital: ${formatMoeda(r.saquesPagos.capital)}`,
    `Saques pagos — rendimento: ${formatMoeda(r.saquesPagos.rendimento)}`,
    `Saques pagos — bônus: ${formatMoeda(r.saquesPagos.bonus)}`,
    `Total pago hoje: ${formatMoeda(r.saquesPagos.capital + r.saquesPagos.rendimento + r.saquesPagos.bonus)} (${r.saquesPagos.quantidade})`,
    `Novos pedidos de saque hoje: ${formatMoeda(r.saquesSolicitadosHoje.total)} (${r.saquesSolicitadosHoje.quantidade})`,
    `Saques ainda pendentes (todos): ${formatMoeda(r.saquesPendentes.total)} (${r.saquesPendentes.quantidade})`,
    ``,
    `<b>Outros números do dia</b>`,
    `PLR/rendimento lançado aos investidores: ${formatMoeda(r.rendimentoLancadoHoje)}`,
    `Novos cadastros: ${r.novosCadastros}`,
    ``,
    `<b>Situação geral (acumulado)</b>`,
    `Capital total ativo na plataforma: ${formatMoeda(r.capitalTotalAtivo)}`,
    `Saldo do Fundo de Caixa: ${formatMoeda(r.saldoFundoCaixa)}`,
  );
  return linhas.join("\n");
}

const ACAO_RELATORIO_ENVIADO = "relatorio_diario_telegram_enviado";

/** Calcula e envia o relatório diário via Telegram — best-effort (nunca lança erro) e idempotente
 *  por dia (marca em LogAuditoria; uma segunda chamada no mesmo dia de Brasília não reenvia).
 *  Chamado só pelo cron (api/cron/relatorio-diario-telegram) — diferente dos outros fallbacks
 *  deste projeto, isso NUNCA deve rodar a cada carregamento de página administrativa, ou o admin
 *  receberia o mesmo relatório repetido a cada clique. */
export async function enviarRelatorioDiario(agora: Date = new Date()): Promise<void> {
  try {
    const { inicio } = limitesDoDiaBrasilia(agora);
    const chave = inicio.toISOString().slice(0, 10);

    const jaEnviado = await prisma.logAuditoria.findFirst({
      where: { acao: ACAO_RELATORIO_ENVIADO, detalhes: chave },
    });
    if (jaEnviado) return;

    const relatorio = await calcularRelatorioDiario(agora);
    await enviarMensagemTelegram(formatarRelatorioDiario(relatorio));
    await prisma.logAuditoria.create({ data: { acao: ACAO_RELATORIO_ENVIADO, detalhes: chave } });
  } catch (e) {
    console.error("Falha ao gerar/enviar o relatório diário:", e);
  }
}
