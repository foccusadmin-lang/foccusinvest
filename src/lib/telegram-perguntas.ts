import { calcularResumoPeriodo, formatarResumoFinanceiro, buscarMaiorSaqueDoPeriodo } from "@/lib/relatorio-diario";
import { formatMoeda } from "@/lib/format";
import { limitesDoDiaBrasilia, inicioDaSemanaBrasilia, inicioDoMesBrasilia } from "@/lib/datas";

export const MENSAGEM_AJUDA = [
  "Pergunte algo como:",
  "• quanto entrou hoje / essa semana / esse mês",
  "• quanto saiu hoje",
  "• qual o faturamento da empresa esse mês",
  "• quanto pagamos de PLR essa semana",
  "• quanto de PLR rendeu esse mês",
  "• quantos investidores novos esse mês",
  "• quem mais sacou esse mês",
  "• saques pendentes",
  "• novos cadastros hoje",
  "• saldo do fundo de caixa",
  "• capital total",
  "• resumo/relatório de hoje / da semana / do mês",
].join("\n");

const DIA_MS = 24 * 60 * 60 * 1000;

export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function periodoDaPergunta(textoNorm: string, agora: Date): { inicio: Date; fim: Date; rotulo: string } {
  if (textoNorm.includes("ontem")) {
    const { inicio, fim } = limitesDoDiaBrasilia(new Date(agora.getTime() - DIA_MS));
    return { inicio, fim, rotulo: "ontem" };
  }
  if (textoNorm.includes("semana")) {
    return { inicio: inicioDaSemanaBrasilia(agora), fim: agora, rotulo: "essa semana" };
  }
  if (textoNorm.includes("mes")) {
    return { inicio: inicioDoMesBrasilia(agora), fim: agora, rotulo: "esse mês" };
  }
  const { inicio } = limitesDoDiaBrasilia(agora);
  return { inicio, fim: agora, rotulo: "hoje" };
}

/** Interpreta uma pergunta em português (deterministicamente, por palavra-chave — nunca por IA:
 *  são números financeiros reais, um "achismo" de modelo de linguagem não é aceitável aqui) e
 *  devolve a resposta pronta pro Telegram. Usada pelo webhook (api/telegram/webhook). Frases mais
 *  específicas são checadas ANTES das genéricas (ex: "pagamos de plr" antes do "plr" genérico,
 *  que senão capturaria a pergunta errada).
 */
export async function responderPergunta(texto: string, agora: Date = new Date()): Promise<string> {
  const norm = normalizar(texto);
  const periodo = periodoDaPergunta(norm, agora);

  // "Quem mais sacou" — ranking, não é um número do resumo comum.
  if (/quem.*(sacou|retirou|tirou)|maior saque/.test(norm)) {
    const top = await buscarMaiorSaqueDoPeriodo(periodo.inicio, periodo.fim);
    if (!top) return `Ninguém sacou ${periodo.rotulo}.`;
    return (
      `Quem mais sacou ${periodo.rotulo}: ${top.nome}\n` +
      `Total: ${formatMoeda(top.total)} (capital ${formatMoeda(top.capital)}, PLR ${formatMoeda(top.rendimento)})\n` +
      `Capital que essa pessoa tem ativo hoje: ${formatMoeda(top.capitalAtual)}`
    );
  }

  const resumo = await calcularResumoPeriodo(periodo.inicio, periodo.fim);

  if (/resumo|relatorio/.test(norm)) {
    return formatarResumoFinanceiro(`📊 Foccus Invest — resumo de ${periodo.rotulo}`, resumo);
  }
  if (/faturamento/.test(norm)) {
    return `Faturamento da empresa (taxas + Pacotes de Serviços) ${periodo.rotulo}: ${formatMoeda(resumo.faturamentoEmpresa)}.`;
  }
  // "Pagamos/pago de PLR" (dinheiro que SAIU) — checa antes do "rendeu" (o que foi creditado).
  if (/(pag\w*).*(plr|rendimento)|(plr|rendimento).*(pag\w*)/.test(norm)) {
    return `Pagamos de PLR (saques de rendimento) ${periodo.rotulo}: ${formatMoeda(resumo.saquesPagos.rendimento)}.`;
  }
  if (/investidor|pessoas/.test(norm)) {
    return `Investidores novos (1º aporte confirmado) ${periodo.rotulo}: ${resumo.novosInvestidores}.`;
  }
  if (/entrou|entrada|aport|investiu|investimento/.test(norm)) {
    return `Entrou ${periodo.rotulo}: ${formatMoeda(resumo.aportesConfirmadosBRL.total)} em ${resumo.aportesConfirmadosBRL.quantidade} aporte(s) confirmado(s).`;
  }
  if (/pendente|aguardando/.test(norm)) {
    return `Saques ainda pendentes (todos, não só ${periodo.rotulo}): ${formatMoeda(resumo.saquesPendentes.total)} em ${resumo.saquesPendentes.quantidade} pedido(s).`;
  }
  if (/saiu|saida|saque/.test(norm)) {
    const totalPago = resumo.saquesPagos.capital + resumo.saquesPagos.rendimento + resumo.saquesPagos.bonus;
    return `Saiu (pago) ${periodo.rotulo}: ${formatMoeda(totalPago)} em ${resumo.saquesPagos.quantidade} saque(s) — capital ${formatMoeda(resumo.saquesPagos.capital)}, rendimento ${formatMoeda(resumo.saquesPagos.rendimento)}, bônus ${formatMoeda(resumo.saquesPagos.bonus)}.`;
  }
  if (/cadastro|usuario/.test(norm)) {
    return `Novos cadastros ${periodo.rotulo}: ${resumo.novosCadastros}.`;
  }
  if (/caixa/.test(norm)) {
    return `Saldo do Fundo de Caixa agora: ${formatMoeda(resumo.saldoFundoCaixa)}.`;
  }
  if (/capital/.test(norm)) {
    return `Capital total ativo na plataforma agora: ${formatMoeda(resumo.capitalTotalAtivo)}.`;
  }
  if (/taxa|carencia/.test(norm)) {
    return `Taxa de saque de carência retida ${periodo.rotulo}: ${formatMoeda(resumo.taxaCarenciaRetida)}.`;
  }
  if (/servico/.test(norm)) {
    return `Receita de Pacotes de Serviços ${periodo.rotulo}: ${formatMoeda(resumo.receitaServicos)}.`;
  }
  if (/rendimento|plr/.test(norm)) {
    return `PLR/rendimento lançado aos investidores ${periodo.rotulo}: ${formatMoeda(resumo.rendimentoLancado)}.`;
  }

  return `Não entendi. ${MENSAGEM_AJUDA}`;
}
