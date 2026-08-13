import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type TxClient = Prisma.TransactionClient;

const UM_DIA_MS = 24 * 60 * 60 * 1000;

export function diasEntre(inicio: Date, fim: Date): number {
  return Math.floor((fim.getTime() - inicio.getTime()) / UM_DIA_MS) + 1;
}

export class SemCapitalElegivelError extends Error {}

/**
 * Lança um resultado real do período como uma porcentagem (ex: "julho deu 3%"). Cada investidor
 * elegível recebe esse mesmo percentual sobre o próprio capital — congelado no momento do
 * lançamento. O pagamento em si é diluído dia a dia por `sincronizarDistribuicoesDoUsuario`.
 */
export async function criarDistribuicao(params: {
  criadoPorId: string;
  periodoInicio: Date;
  periodoFim: Date;
  percentual: number;
  resultadoApurado: string;
  observacoes?: string;
}): Promise<void> {
  const { criadoPorId, periodoInicio, periodoFim, percentual, resultadoApurado, observacoes } =
    params;

  await prisma.$transaction(async (tx) => {
    const usuarios = await tx.user.findMany({
      where: { statusCadastro: "APROVADO" },
      include: { aplicacoes: { omit: { comprovante: true } } },
    });

    const elegiveis = usuarios
      .map((u) => ({
        userId: u.id,
        capital: u.aplicacoes
          .filter((a) => a.status === "CONFIRMADA" || a.status === "SAQUE_SOLICITADO")
          .reduce((acc, a) => acc + a.valor, 0),
      }))
      .filter((u) => u.capital > 0);

    if (elegiveis.length === 0) {
      throw new SemCapitalElegivelError(
        "Nenhum investidor com capital elegível no momento — distribuição não criada."
      );
    }

    const valorTotal = elegiveis.reduce(
      (acc, u) => acc + u.capital * (percentual / 100),
      0
    );

    const distribuicao = await tx.distribuicaoMensal.create({
      data: {
        periodoInicio,
        periodoFim,
        percentual,
        valorTotal,
        resultadoApurado,
        observacoes,
        criadoPorId,
      },
    });

    await tx.distribuicaoParticipante.createMany({
      data: elegiveis.map((u) => ({
        distribuicaoId: distribuicao.id,
        userId: u.userId,
        capitalElegivel: u.capital,
        valorTotalCota: u.capital * (percentual / 100),
      })),
    });
  });
}

/**
 * "Paga por dia": converte em crédito disponível a fatia proporcional aos dias já passados
 * dentro do período de cada distribuição ativa do usuário. Roda sempre que a carteira do
 * usuário é consultada, então não depende de um processo agendado à parte.
 */
export async function sincronizarDistribuicoesDoUsuario(
  tx: TxClient,
  userId: string
): Promise<void> {
  const agora = new Date();

  const participacoes = await tx.distribuicaoParticipante.findMany({
    where: {
      userId,
      distribuicao: { status: "ATIVA", periodoInicio: { lte: agora } },
    },
    include: { distribuicao: true },
  });

  if (participacoes.length === 0) return;

  for (const p of participacoes) {
    const diasTotais = diasEntre(p.distribuicao.periodoInicio, p.distribuicao.periodoFim);
    const diasDecorridos = Math.min(
      diasEntre(p.distribuicao.periodoInicio, agora),
      diasTotais
    );
    const diasNovos = diasDecorridos - p.diasCreditados;
    if (diasNovos <= 0) continue;

    const periodo = `${p.distribuicao.periodoInicio.toISOString().slice(0, 10)} a ${p.distribuicao.periodoFim.toISOString().slice(0, 10)}`;
    const valorPorDia = p.valorTotalCota / diasTotais;
    const valorNovo = valorPorDia * diasNovos;

    await tx.creditoCarteira.create({
      data: {
        userId,
        tipo: "RENDIMENTO",
        valor: valorNovo,
        moeda: p.distribuicao.moeda,
        origem: `Distribuição ${periodo}`,
      },
    });

    await tx.distribuicaoParticipante.update({
      where: { id: p.id },
      data: { diasCreditados: diasDecorridos },
    });
  }
}
