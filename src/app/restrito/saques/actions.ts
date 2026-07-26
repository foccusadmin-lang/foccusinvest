"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") {
    throw new Error("Acesso negado: ação restrita a administradores.");
  }
  return session.user;
}

async function registrarAuditoria(adminId: string, acao: string, detalhes: string) {
  await prisma.logAuditoria.create({ data: { userId: adminId, acao, detalhes } });
}

export async function aprovarSaque(saqueId: string) {
  const admin = await requireAdmin();
  await prisma.solicitacaoSaque.update({
    where: { id: saqueId },
    data: { status: "APROVADO" },
  });
  await registrarAuditoria(admin.id, "aprovar_saque", saqueId);
  revalidatePath("/restrito/saques");
  revalidatePath("/restrito/painel");
}

export async function recusarSaque(saqueId: string, justificativa: string) {
  const admin = await requireAdmin();

  await prisma.$transaction(async (tx) => {
    const saque = await tx.solicitacaoSaque.update({
      where: { id: saqueId },
      data: { status: "RECUSADO", justificativaRecusa: justificativa, processadoEm: new Date() },
    });

    if (saque.tipo === "CAPITAL") {
      await tx.aplicacao.updateMany({
        where: { solicitacaoSaqueId: saqueId },
        data: { status: "CONFIRMADA", solicitacaoSaqueId: null },
      });
    } else {
      await tx.creditoCarteira.updateMany({
        where: { solicitacaoSaqueId: saqueId },
        data: { solicitacaoSaqueId: null },
      });
    }
  });

  await registrarAuditoria(admin.id, "recusar_saque", `${saqueId}: ${justificativa}`);
  revalidatePath("/restrito/saques");
  revalidatePath("/restrito/painel");
}

export async function marcarSaquePago(saqueId: string) {
  const admin = await requireAdmin();

  await prisma.$transaction(async (tx) => {
    const saque = await tx.solicitacaoSaque.update({
      where: { id: saqueId },
      data: { status: "PAGO", processadoEm: new Date() },
    });

    if (saque.tipo === "CAPITAL") {
      await tx.aplicacao.updateMany({
        where: { solicitacaoSaqueId: saqueId },
        data: { status: "RETIRADA" },
      });
    } else {
      await tx.creditoCarteira.updateMany({
        where: { solicitacaoSaqueId: saqueId },
        data: { utilizadoEm: new Date() },
      });
    }
  });

  await registrarAuditoria(admin.id, "pagar_saque", saqueId);
  revalidatePath("/restrito/saques");
  revalidatePath("/restrito/painel");
}
