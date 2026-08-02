"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatMoeda, formatData } from "@/lib/format";

export type CarenciaState = { error?: string; sucesso?: string } | undefined;

const EPSILON = 0.005;

function parseValor(raw: FormDataEntryValue | null): number {
  const texto = String(raw ?? "").trim().replace(/\./g, "").replace(",", ".");
  return Number(texto);
}

/** Redistribui o capital "livre" (lotes CONFIRMADA, não reservados num saque em andamento)
 *  entre uma parte disponível na hora e uma parte em carência até a data escolhida pelo admin.
 *  O total de capital não muda — só como ele está dividido entre disponível/carência. */
export async function ajustarCarenciaUsuario(
  _prevState: CarenciaState,
  formData: FormData
): Promise<CarenciaState> {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") return { error: "Acesso negado." };

  const userId = String(formData.get("userId") ?? "");
  const valorDisponivel = parseValor(formData.get("valorDisponivel"));
  const dataCarencia = String(formData.get("dataCarencia") ?? "");

  if (!userId) return { error: "Usuário inválido." };
  if (Number.isNaN(valorDisponivel) || valorDisponivel < 0) {
    return { error: "Informe um valor disponível válido." };
  }

  const usuario = await prisma.user.findUnique({ where: { id: userId } });
  if (!usuario) return { error: "Usuário não encontrado." };

  const lotes = await prisma.aplicacao.findMany({
    where: { userId, status: "CONFIRMADA" },
    orderBy: { criadoEm: "asc" },
  });
  const totalLivre = lotes.reduce((acc, l) => acc + l.valor, 0);

  if (totalLivre <= EPSILON) {
    return { error: "Esse investidor não tem capital livre pra ajustar (tudo já está reservado num saque ou é zero)." };
  }
  if (valorDisponivel > totalLivre + EPSILON) {
    return {
      error: `O valor disponível não pode passar do capital livre atual (${formatMoeda(totalLivre)}).`,
    };
  }

  const restanteCarencia = Math.max(0, totalLivre - valorDisponivel);

  let novaData: Date | null = null;
  if (restanteCarencia > EPSILON) {
    if (!dataCarencia) return { error: "Informe a data em que o restante sai da carência." };
    novaData = new Date(`${dataCarencia}T00:00:00`);
    if (Number.isNaN(novaData.getTime())) return { error: "Data inválida." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.aplicacao.deleteMany({ where: { id: { in: lotes.map((l) => l.id) } } });

    if (valorDisponivel > EPSILON) {
      await tx.aplicacao.create({
        data: {
          userId,
          valor: valorDisponivel,
          moeda: "BRL",
          origem: "AJUSTE_ADMIN",
          status: "CONFIRMADA",
          liberaEm: new Date(),
        },
      });
    }
    if (restanteCarencia > EPSILON && novaData) {
      await tx.aplicacao.create({
        data: {
          userId,
          valor: restanteCarencia,
          moeda: "BRL",
          origem: "AJUSTE_ADMIN",
          status: "CONFIRMADA",
          liberaEm: novaData,
        },
      });
    }
  });

  await prisma.logAuditoria.create({
    data: {
      userId: session.user.id,
      acao: "ajustar_carencia_usuario",
      detalhes: `${usuario.email} | disponível: ${formatMoeda(valorDisponivel)} | carência: ${formatMoeda(restanteCarencia)}${novaData ? ` até ${formatData(novaData)}` : ""}`,
    },
  });

  revalidatePath("/restrito/usuarios");
  revalidatePath("/restrito/painel");
  revalidatePath("/painel");

  return {
    sucesso: `Capital de ${usuario.name ?? usuario.email} ajustado: ${formatMoeda(valorDisponivel)} disponível${
      restanteCarencia > EPSILON && novaData
        ? `, ${formatMoeda(restanteCarencia)} em carência até ${formatData(novaData)}`
        : ""
    }.`,
  };
}
