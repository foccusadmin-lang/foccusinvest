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

/** Aprovar já debita de verdade da carteira do investidor (Capital vira RETIRADA, rendimento
 *  marca utilizadoEm) — não espera o passo final de "marcar como pago". "Marcar como pago"
 *  fica só como confirmação de que o Pix foi enviado, sem mexer mais no saldo. */
export async function aprovarSaque(saqueId: string) {
  const admin = await requireAdmin();

  await prisma.$transaction(async (tx) => {
    const saque = await tx.solicitacaoSaque.update({
      where: { id: saqueId },
      data: { status: "APROVADO" },
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

  await registrarAuditoria(admin.id, "aprovar_saque", saqueId);
  revalidatePath("/restrito/saques");
  revalidatePath("/restrito/painel");
  revalidatePath("/restrito/usuarios");
  revalidatePath("/restrito/plr-individual");
  revalidatePath("/restrito/reaplicacoes");
  revalidatePath("/restrito/indicacoes");
  revalidatePath("/painel");
  revalidatePath("/painel/historico");
}

/** Recusar sempre devolve o valor pro investidor, esteja o saque ainda só reservado
 *  (SOLICITADO) ou já debitado (aprovado antes de ser recusado). */
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
        data: { solicitacaoSaqueId: null, utilizadoEm: null },
      });
    }
  });

  await registrarAuditoria(admin.id, "recusar_saque", `${saqueId}: ${justificativa}`);
  revalidatePath("/restrito/saques");
  revalidatePath("/restrito/painel");
  revalidatePath("/restrito/usuarios");
  revalidatePath("/restrito/plr-individual");
  revalidatePath("/restrito/reaplicacoes");
  revalidatePath("/restrito/indicacoes");
  revalidatePath("/painel");
  revalidatePath("/painel/historico");
}

/** Só confirma que o Pix foi enviado — o débito da carteira já aconteceu em aprovarSaque.
 *  Exige que o saque já esteja APROVADO (nunca confia só no botão estar desabilitado na tela). */
export async function marcarSaquePago(saqueId: string) {
  const admin = await requireAdmin();

  const saque = await prisma.solicitacaoSaque.findUnique({ where: { id: saqueId } });
  if (!saque || saque.status !== "APROVADO") {
    throw new Error("Esse saque precisa estar aprovado (e debitado da carteira) antes de marcar como pago.");
  }

  await prisma.solicitacaoSaque.update({
    where: { id: saqueId },
    data: { status: "PAGO", processadoEm: new Date() },
  });

  await registrarAuditoria(admin.id, "pagar_saque", saqueId);
  revalidatePath("/restrito/saques");
  revalidatePath("/restrito/painel");
}
