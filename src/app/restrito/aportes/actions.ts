"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calcularLiberacao } from "@/lib/carteira";
import { extrairCodigoIndicadorPendente, creditarBonusIndicacaoPorCodigo } from "@/lib/indicacao";
import { notificarAporteConfirmado } from "@/lib/notificacoes";

export type AporteAcaoState = { error?: string; sucesso?: string } | undefined;

export async function aprovarAporte(id: string) {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") throw new Error("Acesso negado.");

  const aplicacao = await prisma.aplicacao.findUnique({ where: { id } });
  if (!aplicacao || aplicacao.status !== "AGUARDANDO_APROVACAO") {
    throw new Error("Este aporte não está mais aguardando aprovação.");
  }

  const codigoIndicador = extrairCodigoIndicadorPendente(aplicacao.motivoRejeicao);

  await prisma.$transaction(async (tx) => {
    await tx.aplicacao.update({
      where: { id },
      data: {
        status: "CONFIRMADA",
        liberaEm: calcularLiberacao(),
        aprovadoPorId: session.user.id,
        aprovadoEm: new Date(),
        motivoRejeicao: null,
      },
    });

    if (codigoIndicador) {
      await creditarBonusIndicacaoPorCodigo(tx, {
        codigoIndicador,
        aplicacaoId: aplicacao.id,
        aportanteUserId: aplicacao.userId,
        valorAporte: aplicacao.valor,
      });
    }
  });

  await prisma.logAuditoria.create({
    data: { userId: session.user.id, acao: "aprovar_aporte", detalhes: id },
  });

  // Fora da transação de propósito: e-mail/WhatsApp são best-effort (nunca lançam erro) e não
  // devem fazer a confirmação do aporte esperar nem, muito menos, reverter se falharem.
  await notificarAporteConfirmado(aplicacao.userId, aplicacao.valor);

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

/** Pra quando o investidor esquece de colocar o código na hora do aporte — admin adiciona
 *  depois, sobre um aporte já confirmado. Só funciona uma vez por aporte (ver
 *  creditarBonusIndicacaoPorCodigo, que é idempotente por aplicacaoId). */
export async function adicionarIndicacaoRetroativa(
  aplicacaoId: string,
  codigoIndicador: string
): Promise<{ error?: string; sucesso?: string }> {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") return { error: "Acesso negado." };

  const aplicacao = await prisma.aplicacao.findUnique({ where: { id: aplicacaoId } });
  if (!aplicacao) return { error: "Aporte não encontrado." };
  if (aplicacao.status !== "CONFIRMADA") {
    return { error: "Só é possível adicionar indicação em aportes já confirmados." };
  }

  const resultado = await prisma.$transaction((tx) =>
    creditarBonusIndicacaoPorCodigo(tx, {
      codigoIndicador,
      aplicacaoId: aplicacao.id,
      aportanteUserId: aplicacao.userId,
      valorAporte: aplicacao.valor,
    })
  );
  if (resultado.error) return { error: resultado.error };

  await prisma.logAuditoria.create({
    data: {
      userId: session.user.id,
      acao: "adicionar_indicacao_retroativa",
      detalhes: `${aplicacaoId} | código ${codigoIndicador.trim().toUpperCase()}`,
    },
  });

  revalidatePath("/restrito/aportes");
  revalidatePath("/restrito/painel");
  return { sucesso: "Bônus de indicação creditado." };
}
