"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { creditarDoacaoNaEntidade } from "@/lib/entidades";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") throw new Error("Acesso negado.");
  return session.user;
}

export async function aprovarDoacao(doacaoId: string) {
  const admin = await requireAdmin();

  const doacao = await prisma.doacao.findUnique({ where: { id: doacaoId }, include: { entidade: true } });
  if (!doacao || doacao.status !== "EM_ANALISE") {
    throw new Error("Essa doação não está mais aguardando aprovação.");
  }

  await prisma.$transaction(async (tx) => {
    const aplicacaoId = await creditarDoacaoNaEntidade(tx, doacao.entidade.userId, doacao.valorLiquido);
    await tx.doacao.update({
      where: { id: doacaoId },
      data: {
        status: "CONFIRMADA",
        aplicacaoId,
        confirmadoEm: new Date(),
        aprovadoPorId: admin.id,
        aprovadoEm: new Date(),
      },
    });
  });

  await prisma.logAuditoria.create({
    data: { userId: admin.id, acao: "aprovar_doacao", detalhes: doacaoId },
  });

  revalidatePath("/restrito/doacoes");
  revalidatePath("/painel/doar");
}

export async function recusarDoacao(doacaoId: string, motivo: string) {
  const admin = await requireAdmin();

  const doacao = await prisma.doacao.findUnique({ where: { id: doacaoId } });
  if (!doacao || doacao.status !== "EM_ANALISE") {
    throw new Error("Essa doação não está mais aguardando aprovação.");
  }

  await prisma.doacao.update({
    where: { id: doacaoId },
    data: {
      status: "CANCELADA",
      motivoRecusa: motivo || "Comprovante não confere.",
      aprovadoPorId: admin.id,
      aprovadoEm: new Date(),
    },
  });

  await prisma.logAuditoria.create({
    data: { userId: admin.id, acao: "recusar_doacao", detalhes: `${doacaoId} | ${motivo}` },
  });

  revalidatePath("/restrito/doacoes");
}
