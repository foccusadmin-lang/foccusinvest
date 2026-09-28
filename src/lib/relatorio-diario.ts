import { prisma } from "@/lib/prisma";
import { getResumoCarteira } from "@/lib/carteira";
import { limitesDoDiaBrasilia } from "@/lib/datas";
import { formatMoeda } from "@/lib/format";
import { enviarMensagemTelegram } from "@/lib/telegram";

const EMAIL_ADMINISTRADORA = "foccusadmin@gmail.com";
const PREFIXO_TAXA_CARENCIA = "Taxa de saque de carência";

export type ResumoFinanceiro = {
  aportesConfirmadosBRL: { total: number; quantidade: number };
  aportesConfirmadosUSDT: { total: number; quantidade: number };
  aportesEmAnaliseBRL: { total: number; quantidade: number };
  saquesPagos: { capital: number; rendimento: number; bonus: number; quantidade: number };
  saquesSolicitados: { total: number; quantidade: number };
  // Sempre um retrato de AGORA (não do período) — um saque pendente não "pertence" a um dia só.
  saquesPendentes: { total: number; quantidade: number };
  taxaCarenciaRetida: number;
  receitaServicos: number;
  rendimentoLancado: number;
  novosCadastros: number;
  // Investidores cujo PRIMEIRO aporte confirmado caiu dentro do período — diferente de
  // novosCadastros (que conta qualquer cadastro, mesmo quem nunca aportou).
  novosInvestidores: number;
  // Receita de verdade da empresa (taxa de carência + Pacotes de Serviços) — não confundir com
  // aportes, que são capital do investidor entrando, não faturamento da Foccus.
  faturamentoEmpresa: number;
  // Também um retrato de agora — capital ativo e saldo do fundo não são um fluxo do período.
  capitalTotalAtivo: number;
  saldoFundoCaixa: number;
};

/** Monta os números de um período [inicio, fim] pro relatório financeiro do admin — mesma base
 *  de dados já usada em restrito/painel, restrito/fundo-caixa e restrito/saques, só reagrupada
 *  por data. Usado tanto pelo relatório diário automático (período = 1 dia) quanto pelo bot do
 *  Telegram respondendo perguntas com outros períodos (semana, mês). */
export async function calcularResumoPeriodo(inicio: Date, fim: Date): Promise<ResumoFinanceiro> {
  const administradora = await prisma.user.findFirst({ where: { email: EMAIL_ADMINISTRADORA } });

  const [
    aportesConfirmados,
    aportesEmAnalise,
    saquesPagosPeriodo,
    saquesSolicitados,
    saquesPendentes,
    creditosRendimentoPeriodo,
    receitaServicos,
    novosCadastros,
    capitalTotal,
  ] = await Promise.all([
    prisma.aplicacao.findMany({
      where: { status: "CONFIRMADA", aprovadoEm: { gte: inicio, lte: fim } },
      select: { valor: true, moeda: true, userId: true },
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

  const saquesPagos = saquesPagosPeriodo.reduce(
    (acc, s) => {
      if (s.tipo === "CAPITAL") acc.capital += s.valor;
      else if (s.tipo === "RENDIMENTO") acc.rendimento += s.valor;
      else acc.bonus += s.valor;
      acc.quantidade += 1;
      return acc;
    },
    { capital: 0, rendimento: 0, bonus: 0, quantidade: 0 }
  );

  const taxaCarenciaRetida = administradora
    ? creditosRendimentoPeriodo
        .filter((c) => c.userId === administradora.id && c.origem.startsWith(PREFIXO_TAXA_CARENCIA))
        .reduce((acc, c) => acc + c.valor, 0)
    : 0;

  // PLR/rendimento de verdade pros investidores — exclui a própria conta da administradora
  // (aquilo ali é receita/fundo de caixa, não distribuição).
  const rendimentoLancado = creditosRendimentoPeriodo
    .filter((c) => !administradora || c.userId !== administradora.id)
    .reduce((acc, c) => acc + c.valor, 0);

  const saldoFundoCaixa = administradora
    ? await getResumoCarteira(administradora.id).then(
        (r) => r.capitalPrincipal + r.distribuicoesDisponiveis + r.bonusIndicacao
      )
    : 0;

  // Novo investidor = teve um aporte confirmado no período E nunca teve nenhum aporte confirmado
  // ANTES do período começar (checagem por criadoEm, sempre presente, em vez de aprovadoEm, que
  // pode faltar em registros bem antigos).
  const useridsComAporteNoPeriodo = [...new Set(aportesConfirmadosBRL.map((a) => a.userId))];
  let novosInvestidores = 0;
  if (useridsComAporteNoPeriodo.length > 0) {
    const comHistoricoAnterior = await prisma.aplicacao.groupBy({
      by: ["userId"],
      where: {
        userId: { in: useridsComAporteNoPeriodo },
        origem: "NOVA_APLICACAO",
        status: { in: ["CONFIRMADA", "SAQUE_SOLICITADO", "RETIRADA"] },
        criadoEm: { lt: inicio },
      },
    });
    const idsComHistorico = new Set(comHistoricoAnterior.map((r) => r.userId));
    novosInvestidores = useridsComAporteNoPeriodo.filter((id) => !idsComHistorico.has(id)).length;
  }

  return {
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
    saquesSolicitados: { total: saquesSolicitados._sum.valor ?? 0, quantidade: saquesSolicitados._count },
    saquesPendentes: { total: saquesPendentes._sum.valor ?? 0, quantidade: saquesPendentes._count },
    taxaCarenciaRetida,
    receitaServicos: receitaServicos._sum.valorFinal ?? 0,
    rendimentoLancado,
    novosCadastros,
    novosInvestidores,
    faturamentoEmpresa: taxaCarenciaRetida + (receitaServicos._sum.valorFinal ?? 0),
    capitalTotalAtivo: capitalTotal._sum.valor ?? 0,
    saldoFundoCaixa,
  };
}

export type MaiorSaqueDoPeriodo = {
  nome: string;
  capital: number;
  rendimento: number;
  total: number;
  capitalAtual: number;
};

/** "Quem mais sacou" no período — soma capital + rendimento pagos (status PAGO) por investidor e
 *  devolve quem teve o maior total, junto com o capital que essa pessoa tem ativo hoje. */
export async function buscarMaiorSaqueDoPeriodo(inicio: Date, fim: Date): Promise<MaiorSaqueDoPeriodo | null> {
  const porUsuario = await prisma.solicitacaoSaque.groupBy({
    by: ["userId"],
    where: { status: "PAGO", pagoEm: { gte: inicio, lte: fim } },
    _sum: { valor: true },
  });
  if (porUsuario.length === 0) return null;

  const ranking = porUsuario
    .map((p) => ({ userId: p.userId, total: p._sum.valor ?? 0 }))
    .sort((a, b) => b.total - a.total);
  const top = ranking[0];

  const [usuario, saquesDoTop, capitalAtual] = await Promise.all([
    prisma.user.findUnique({ where: { id: top.userId }, include: { pessoaFisica: true, pessoaJuridica: true } }),
    prisma.solicitacaoSaque.findMany({
      where: { userId: top.userId, status: "PAGO", pagoEm: { gte: inicio, lte: fim } },
      select: { tipo: true, valor: true },
    }),
    prisma.aplicacao.aggregate({
      where: { userId: top.userId, status: { in: ["CONFIRMADA", "SAQUE_SOLICITADO"] }, moeda: { not: "USDT" } },
      _sum: { valor: true },
    }),
  ]);

  const capital = saquesDoTop.filter((s) => s.tipo === "CAPITAL").reduce((a, s) => a + s.valor, 0);
  const rendimento = saquesDoTop.filter((s) => s.tipo !== "CAPITAL").reduce((a, s) => a + s.valor, 0);

  return {
    nome: usuario?.pessoaFisica?.nomeCompleto ?? usuario?.pessoaJuridica?.razaoSocial ?? usuario?.name ?? usuario?.email ?? "desconhecido",
    capital,
    rendimento,
    total: top.total,
    capitalAtual: capitalAtual._sum.valor ?? 0,
  };
}

/** Período de 1 dia (Brasília) — usado pelo relatório automático da meia-noite. */
export async function calcularRelatorioDiario(agora: Date = new Date()): Promise<{ inicio: Date; resumo: ResumoFinanceiro }> {
  const { inicio, fim } = limitesDoDiaBrasilia(agora);
  return { inicio, resumo: await calcularResumoPeriodo(inicio, fim) };
}

function dataBRExtenso(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" }).format(data);
}

/** Texto pronto pro Telegram (HTML simples: negrito só). */
export function formatarResumoFinanceiro(titulo: string, r: ResumoFinanceiro): string {
  const linhas = [
    `<b>${titulo}</b>`,
    ``,
    `<b>Entradas</b>`,
    `Aportes confirmados (R$): ${formatMoeda(r.aportesConfirmadosBRL.total)} (${r.aportesConfirmadosBRL.quantidade})`,
  ];
  if (r.aportesConfirmadosUSDT.quantidade > 0) {
    linhas.push(`Aportes confirmados (USDT): ${r.aportesConfirmadosUSDT.total.toFixed(2)} (${r.aportesConfirmadosUSDT.quantidade})`);
  }
  linhas.push(
    `Aportes aguardando aprovação: ${formatMoeda(r.aportesEmAnaliseBRL.total)} (${r.aportesEmAnaliseBRL.quantidade})`,
    `Receita de Pacotes de Serviços: ${formatMoeda(r.receitaServicos)}`,
    `Taxa de saque de carência retida: ${formatMoeda(r.taxaCarenciaRetida)}`,
    ``,
    `<b>Saídas</b>`,
    `Saques pagos — capital: ${formatMoeda(r.saquesPagos.capital)}`,
    `Saques pagos — rendimento: ${formatMoeda(r.saquesPagos.rendimento)}`,
    `Saques pagos — bônus: ${formatMoeda(r.saquesPagos.bonus)}`,
    `Total pago: ${formatMoeda(r.saquesPagos.capital + r.saquesPagos.rendimento + r.saquesPagos.bonus)} (${r.saquesPagos.quantidade})`,
    `Novos pedidos de saque: ${formatMoeda(r.saquesSolicitados.total)} (${r.saquesSolicitados.quantidade})`,
    `Saques ainda pendentes (todos, não só o período): ${formatMoeda(r.saquesPendentes.total)} (${r.saquesPendentes.quantidade})`,
    ``,
    `<b>Outros números do período</b>`,
    `Faturamento da empresa (taxas + serviços): ${formatMoeda(r.faturamentoEmpresa)}`,
    `PLR/rendimento lançado aos investidores: ${formatMoeda(r.rendimentoLancado)}`,
    `Novos cadastros: ${r.novosCadastros}`,
    `Novos investidores (1º aporte confirmado): ${r.novosInvestidores}`,
    ``,
    `<b>Situação geral (agora)</b>`,
    `Capital total ativo na plataforma: ${formatMoeda(r.capitalTotalAtivo)}`,
    `Saldo do Fundo de Caixa: ${formatMoeda(r.saldoFundoCaixa)}`,
  );
  return linhas.join("\n");
}

export function formatarRelatorioDiario(inicio: Date, r: ResumoFinanceiro): string {
  return formatarResumoFinanceiro(`📊 Foccus Invest — relatório de ${dataBRExtenso(inicio)}`, r);
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

    const { resumo } = await calcularRelatorioDiario(agora);
    await enviarMensagemTelegram(formatarRelatorioDiario(inicio, resumo));
    await prisma.logAuditoria.create({ data: { acao: ACAO_RELATORIO_ENVIADO, detalhes: chave } });
  } catch (e) {
    console.error("Falha ao gerar/enviar o relatório diário:", e);
  }
}
