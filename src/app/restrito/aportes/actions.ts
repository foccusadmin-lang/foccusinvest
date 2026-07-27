"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calcularLiberacao } from "@/lib/carteira";
import { creditarBonusIndicacaoSeElegivel } from "@/lib/indicacao";

export type AporteAcaoState = { error?: string; sucesso?: string } | undefined;

export async function aprovarAporte(id: string) {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") throw new Error("Acesso negado.");

  const aplicacao = await prisma.aplicacao.findUnique({ where: { id } });
  if (!aplicacao || aplicacao.status !== "AGUARDANDO_APROVACAO") {
    throw new Error("Este aporte não está mais aguardando aprovação.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.aplicacao.update({
      where: { id },
      data: {
        status: "CONFIRMADA",
        liberaEm: calcularLiberacao(),
        aprovadoPorId: session.user.id,
        aprovadoEm: new Date(),
      },
    });

    if (aplicacao.origem === "NOVA_APLICACAO") {
      await creditarBonusIndicacaoSeElegivel(tx, aplicacao.userId, aplicacao.valor);
    }
  });

  await prisma.logAuditoria.create({
    data: { userId: session.user.id, acao: "aprovar_aporte", detalhes: id },
  });

  revalidatePath("/restrito/aportes");
  revalidatePath("/restrito/painel");
}

export async function rejeitarAporte(id: string, motivo: string) {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") throw new Error("Acesso negado.");

  const aplicacao = await prisma.aplicacao.findUnique({ where: { id } });
  if (!aplicacao || aplicacao.status !== "AGUARDANDO_APROVACAO") {
    throw new Error("Este aporte não está mais aguardando aprovação.");
  }

  await prisma.aplicacao.update({
    where: { id },
    data: {
      status: "REJEITADA",
      motivoRejeicao: motivo || "Comprovante não confere.",
      aprovadoPorId: session.user.id,
      aprovadoEm: new Date(),
    },
  });

  await prisma.logAuditoria.create({
    data: { userId: session.user.id, acao: "rejeitar_aporte", detalhes: `${id} | ${motivo}` },
  });

  revalidatePath("/restrito/aportes");
  revalidatePath("/restrito/painel");
}
