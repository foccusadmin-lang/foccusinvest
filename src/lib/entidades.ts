import { prisma } from "@/lib/prisma";
import { consumirFIFO, SaldoInsuficienteError, type TxClient } from "@/lib/carteira";
import { isValidCNPJ, onlyDigits } from "@/lib/cpf-cnpj";
import { formatMoeda } from "@/lib/format";
import type { TipoEntidade } from "@prisma/client";

/** Valor padrão sugerido pra taxa de ativação — o admin pode mudar por entidade ao cadastrar. */
export const TAXA_ATIVACAO_PADRAO = 100;

/** Transforma um investidor Pessoa Jurídica já cadastrado em Entidade, sem perder e-mail,
 *  capital ou histórico — só adiciona o perfil de Entidade por cima dos dados de PJ que já
 *  existem. Usado quando a igreja/ONG/associação já tinha aportado como investidor comum antes
 *  de existir a área de Entidades. */
export async function converterUsuarioEmEntidade(
  cnpj: string,
  params: { tipoEntidade: TipoEntidade; chavePix: string; taxaAtivacao: number; adminId: string }
): Promise<{ error?: string; entidadeId?: string }> {
  const cnpjLimpo = onlyDigits(cnpj);
  const pj = await prisma.pessoaJuridica.findUnique({
    where: { cnpj: cnpjLimpo },
    include: { user: { include: { entidade: true } } },
  });

  if (!pj) return { error: "Nenhum investidor Pessoa Jurídica encontrado com esse CNPJ." };
  if (pj.user.entidade) return { error: "Esse usuário já é uma entidade." };
  if (pj.user.perfil === "ADMIN") return { error: "Não é possível transformar uma conta administradora em entidade." };

  const entidade = await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: pj.userId }, data: { perfil: "ENTIDADE" } });
    return tx.entidade.create({
      data: {
        userId: pj.userId,
        tipoEntidade: params.tipoEntidade,
        chavePix: params.chavePix,
        taxaAtivacao: params.taxaAtivacao,
        status: "EM_ANALISE",
      },
    });
  });

  await prisma.logAuditoria.create({
    data: {
      userId: params.adminId,
      acao: "converter_usuario_em_entidade",
      detalhes: `${pj.user.email} (${pj.razaoSocial}) -> entidade ${entidade.id}`,
    },
  });

  return { entidadeId: entidade.id };
}

const EPSILON = 0.005;

export type RequisitosAtivacao = {
  elegivel: boolean;
  pendencias: string[];
  saldoAtual: number;
  taxaAtivacao: number;
};

/** Confere todos os requisitos obrigatórios pra ativação (dados, documentos, termos e saldo),
 *  igual ao checklist do admin — usado tanto pra mostrar o que falta quanto pra bloquear o
 *  botão de ativar de verdade no servidor. */
export async function checarRequisitosAtivacao(entidadeId: string): Promise<RequisitosAtivacao> {
  const entidade = await prisma.entidade.findUnique({
    where: { id: entidadeId },
    include: { user: { include: { pessoaJuridica: true } } },
  });

  if (!entidade) {
    return { elegivel: false, pendencias: ["Entidade não encontrada."], saldoAtual: 0, taxaAtivacao: 0 };
  }

  const pendencias: string[] = [];
  const pj = entidade.user.pessoaJuridica;

  if (!pj) {
    pendencias.push("Razão social, CNPJ e responsável legal não preenchidos.");
  } else {
    if (!isValidCNPJ(pj.cnpj)) pendencias.push("CNPJ inválido.");
    if (!pj.representanteLegal.trim()) pendencias.push("Nome do responsável legal não informado.");
    if (!pj.cpfRepresentante.trim()) pendencias.push("CPF do responsável não informado.");
    if (!pj.telefone?.trim()) pendencias.push("Telefone não informado.");
    if (!pj.endereco?.trim()) pendencias.push("Endereço não informado.");
  }
  if (!entidade.chavePix?.trim()) pendencias.push("Chave Pix não informada.");
  if (!entidade.documentosAprovados) pendencias.push("Documentos ainda não aprovados.");
  if (!entidade.termosAceitos) pendencias.push("Termos e contrato ainda não aceitos pela entidade.");

  const capital = await prisma.aplicacao.aggregate({
    where: { userId: entidade.userId, status: { in: ["CONFIRMADA", "SAQUE_SOLICITADO"] } },
    _sum: { valor: true },
  });
  const saldoAtual = capital._sum.valor ?? 0;
  if (saldoAtual + EPSILON < entidade.taxaAtivacao) {
    pendencias.push(
      `Saldo insuficiente pra ativação (tem ${formatMoeda(saldoAtual)}, precisa de ${formatMoeda(entidade.taxaAtivacao)}).`
    );
  }

  return { elegivel: pendencias.length === 0, pendencias, saldoAtual, taxaAtivacao: entidade.taxaAtivacao };
}

/** Ativa a entidade depois de conferir os requisitos de novo no servidor (nunca confia só na
 *  tela) — libera recebimento de doações e novas aplicações, e registra quem ativou. */
export async function ativarEntidade(
  entidadeId: string,
  adminId: string,
  ip: string | null
): Promise<{ error?: string }> {
  const requisitos = await checarRequisitosAtivacao(entidadeId);
  if (!requisitos.elegivel) {
    return { error: `Requisitos pendentes: ${requisitos.pendencias.join(" ")}` };
  }

  await prisma.$transaction(async (tx) => {
    await tx.entidade.update({
      where: { id: entidadeId },
      data: {
        status: "ATIVA",
        dataAtivacao: new Date(),
        ativadaPorId: adminId,
        podeReceberDoacao: true,
        podeReceberAplicacao: true,
      },
    });

    await tx.logAuditoria.create({
      data: { userId: adminId, acao: "ativar_entidade", detalhes: `Entidade ${entidadeId}`, ip },
    });
  });

  return {};
}

/** Consome o saldo "livre pra doar" do doador (rendimento + bônus ainda não usados, a mesma
 *  base que já vale pra Reaplicar) via FIFO — não cria capital novo pro doador, o valor sai da
 *  carteira dele de vez. */
export async function debitarSaldoDisponivelParaDoacao(
  tx: TxClient,
  doadorUserId: string,
  valor: number
): Promise<void> {
  const disponiveis = await tx.creditoCarteira.findMany({
    where: { userId: doadorUserId, utilizadoEm: null, solicitacaoSaqueId: null },
    orderBy: [{ tipo: "desc" }, { criadoEm: "asc" }], // RENDIMENTO antes de BONUS
  });

  const restante = await consumirFIFO(
    disponiveis,
    valor,
    async (credito) => {
      await tx.creditoCarteira.update({ where: { id: credito.id }, data: { utilizadoEm: new Date() } });
    },
    async (credito, _valorConsumido, valorRestanteNaLinha) => {
      const cheio = await tx.creditoCarteira.findUniqueOrThrow({ where: { id: credito.id } });
      await tx.creditoCarteira.update({ where: { id: credito.id }, data: { valor: valorRestanteNaLinha } });
      await tx.creditoCarteira.create({
        data: {
          userId: doadorUserId,
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
    throw new SaldoInsuficienteError("Saldo disponível insuficiente para essa doação.");
  }
}

/** Credita o valor líquido de uma doação direto na carteira (Capital) da entidade, disponível
 *  na hora — entidade não tem carência de 90 dias como um aporte comum. */
export async function creditarDoacaoNaEntidade(
  tx: TxClient,
  entidadeUserId: string,
  valor: number
): Promise<string> {
  const aplicacao = await tx.aplicacao.create({
    data: {
      userId: entidadeUserId,
      valor,
      moeda: "BRL",
      origem: "DOACAO",
      status: "CONFIRMADA",
      liberaEm: new Date(),
    },
  });
  return aplicacao.id;
}
