"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatMoeda } from "@/lib/format";

export type PlrIndividualState = { error?: string; sucesso?: string } | undefined;

function parsePercentual(raw: FormDataEntryValue | null): number {
  const texto = String(raw ?? "").trim().replace(",", ".");
  return Number(texto);
}

export async function aplicarPlrIndividual(
  _prevState: PlrIndividualState,
  formData: FormData
): Promise<PlrIndividualState> {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") return { error: "Acesso negado." };

  const percentual = parsePercentual(formData.get("percentual"));
  const userIds = formData.getAll("userIds").map(String);
  const observacao = String(formData.get("observacao") ?? "").trim();

  if (!percentual || percentual <= 0 || Number.isNaN(percentual) || percentual > 100) {
    return { error: "Informe um percentual válido (ex: 0,5 para 0,5%)." };
  }
  if (userIds.length === 0) {
    return { error: "Selecione ao menos um usuário." };
  }

  const capitaisPorUsuario = await prisma.aplicacao.groupBy({
    by: ["userId"],
    where: { userId: { in: userIds }, status: { in: ["CONFIRMADA", "SAQUE_SOLICITADO"] } },
    _sum: { valor: true },
  });
  const capitalPorId = new Map(capitaisPorUsuario.map((c) => [c.userId, c._sum.valor ?? 0]));

  const origem = observacao
    ? `PLR manual ${percentual}% (admin) — ${observacao}`
    : `PLR manual ${percentual}% (admin)`;

  let totalCreditado = 0;
  let usuariosCreditados = 0;

  await prisma.$transaction(async (tx) => {
    for (const userId of userIds) {
      const capital = capitalPorId.get(userId) ?? 0;
      if (capital <= 0) continue;

      const valor = capital * (percentual / 100);
      if (valor <= 0) continue;

      await tx.creditoCarteira.create({
        data: { userId, tipo: "RENDIMENTO", valor, moeda: "BRL", origem },
      });

      totalCreditado += valor;
      usuariosCreditados++;
    }
  });

  await prisma.logAuditoria.create({
    data: {
      userId: session.user.id,
      acao: "aplicar_plr_individual",
      detalhes: `${percentual}% para ${usuariosCreditados} usuário(s), total ${formatMoeda(totalCreditado)}${observacao ? ` | ${observacao}` : ""}`,
    },
  });

  revalidatePath("/restrito/plr-individual");
  revalidatePath("/restrito/usuarios");
  revalidatePath("/restrito/painel");

  if (usuariosCreditados === 0) {
    return { error: "Nenhum dos usuários selecionados tem capital elegível (maior que zero)." };
  }

  return {
    sucesso: `PLR de ${percentual}% aplicado para ${usuariosCreditados} investidor(es). Total creditado: ${formatMoeda(totalCreditado)}.`,
  };
}

export async function excluirCreditoPlrIndividual(creditoId: string) {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") throw new Error("Acesso negado.");

  const credito = await prisma.creditoCarteira.findUnique({ where: { id: creditoId } });
  if (!credito) throw new Error("Lançamento não encontrado.");
  if (credito.utilizadoEm || credito.solicitacaoSaqueId) {
    throw new Error("Esse valor já foi usado ou está reservado num saque — não é possível apagar.");
  }

  await prisma.creditoCarteira.delete({ where: { id: creditoId } });

  await prisma.logAuditoria.create({
    data: {
      userId: session.user.id,
      acao: "excluir_credito_plr_individual",
      detalhes: `${creditoId} | ${credito.userId} | ${formatMoeda(credito.valor)}`,
    },
  });

  revalidatePath("/restrito/plr-individual");
  revalidatePath("/restrito/usuarios");
  revalidatePath("/restrito/painel");
}
