"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { criarDistribuicao, SemCapitalElegivelError } from "@/lib/distribuicao";

export type DistribuicaoState = { error?: string; sucesso?: string } | undefined;

function parseValor(raw: FormDataEntryValue | null): number {
  const texto = String(raw ?? "").trim().replace(/\./g, "").replace(",", ".");
  return Number(texto);
}

export async function lancarDistribuicao(
  _prevState: DistribuicaoState,
  formData: FormData
): Promise<DistribuicaoState> {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") {
    return { error: "Acesso negado." };
  }

  const periodoInicioStr = String(formData.get("periodoInicio") ?? "");
  const periodoFimStr = String(formData.get("periodoFim") ?? "");
  const percentual = parseValor(formData.get("percentual"));
  const resultadoApurado = String(formData.get("resultadoApurado") ?? "").trim();
  const observacoes = String(formData.get("observacoes") ?? "").trim();

  if (!periodoInicioStr || !periodoFimStr) {
    return { error: "Informe o período de apuração." };
  }
  const periodoInicio = new Date(periodoInicioStr);
  const periodoFim = new Date(periodoFimStr);
  if (periodoFim <= periodoInicio) {
    return { error: "A data final deve ser depois da data inicial." };
  }
  if (!percentual || percentual <= 0 || Number.isNaN(percentual) || percentual > 100) {
    return { error: "Informe uma porcentagem válida (ex: 3 para 3%)." };
  }
  if (!resultadoApurado || resultadoApurado.length < 10) {
    return {
      error: "Descreva o resultado apurado (base para esta distribuição) com mais detalhe.",
    };
  }

  try {
    await criarDistribuicao({
      criadoPorId: session.user.id,
      periodoInicio,
      periodoFim,
      percentual,
      resultadoApurado,
      observacoes: observacoes || undefined,
    });
  } catch (e) {
    if (e instanceof SemCapitalElegivelError) {
      return { error: e.message };
    }
    throw e;
  }

  revalidatePath("/restrito/distribuicoes");
  revalidatePath("/restrito/painel");
  return { sucesso: "Distribuição lançada. O pagamento será diluído automaticamente ao longo do período." };
}

/**
 * Apaga uma distribuição (e suas cotas de participante, em cascata) e qualquer crédito de
 * rendimento já diluído a partir dela que ainda esteja livre (não usado nem reservado num
 * saque). Se parte do valor já foi usada/reservada, bloqueia — apagar corromperia dinheiro
 * já movimentado.
 */
export async function excluirDistribuicao(distribuicaoId: string): Promise<{ error?: string }> {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") return { error: "Acesso negado." };

  const distribuicao = await prisma.distribuicaoMensal.findUnique({
    where: { id: distribuicaoId },
  });
  if (!distribuicao) return { error: "Distribuição não encontrada." };

  const origem = `Distribuição ${distribuicao.periodoInicio.toISOString().slice(0, 10)} a ${distribuicao.periodoFim.toISOString().slice(0, 10)}`;

  const creditosGerados = await prisma.creditoCarteira.findMany({
    where: { tipo: "RENDIMENTO", origem },
  });
  const jaMovimentado = creditosGerados.some((c) => c.utilizadoEm || c.solicitacaoSaqueId);
  if (jaMovimentado) {
    return {
      error:
        "Parte do rendimento gerado por essa distribuição já foi usada ou reservada num saque — não é possível apagar.",
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.creditoCarteira.deleteMany({ where: { tipo: "RENDIMENTO", origem } });
    await tx.distribuicaoMensal.delete({ where: { id: distribuicaoId } });
  });

  await prisma.logAuditoria.create({
    data: {
      userId: session.user.id,
      acao: "excluir_distribuicao",
      detalhes: `${origem} | ${distribuicao.percentual}% | ${creditosGerados.length} crédito(s) removido(s)`,
    },
  });

  revalidatePath("/restrito/distribuicoes");
  revalidatePath("/restrito/painel");
  return {};
}
