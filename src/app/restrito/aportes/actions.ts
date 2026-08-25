"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { confirmarAporte, type AjusteBem } from "@/lib/aportes";
import { creditarBonusIndicacaoPorCodigo, creditarBonusIndicacaoPorAporte } from "@/lib/indicacao";

export type AporteAcaoState = { error?: string; sucesso?: string } | undefined;

export async function aprovarAporte(id: string, ajusteBem?: AjusteBem) {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") throw new Error("Acesso negado.");

  await confirmarAporte(id, session.user.id, ajusteBem);

  revalidatePath("/restrito/aportes");
  revalidatePath("/restrito/painel");
  revalidatePath("/painel");
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

/** Libera manualmente o bônus de indicação de um aporte específico (que não seja o primeiro do
 *  indicado, ou que o modo automático não tenha pego) — usa o vínculo de indicação já fixado no
 *  cadastro (`indicadoPorId`), sem precisar de código. Disponível em qualquer modo, pra sempre
 *  dar um jeito de corrigir manualmente. Idempotente por aplicacaoId. */
export async function liberarBonusIndicacaoManual(
  aplicacaoId: string
): Promise<{ error?: string; sucesso?: string }> {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") return { error: "Acesso negado." };

  const aplicacao = await prisma.aplicacao.findUnique({ where: { id: aplicacaoId } });
  if (!aplicacao) return { error: "Aporte não encontrado." };
  if (aplicacao.status !== "CONFIRMADA") {
    return { error: "Só é possível liberar bônus em aportes já confirmados." };
  }

  const resultado = await prisma.$transaction((tx) =>
    creditarBonusIndicacaoPorAporte(tx, {
      aplicacaoId: aplicacao.id,
      aportanteUserId: aplicacao.userId,
      valorAporte: aplicacao.valor,
    })
  );
  if (resultado.error) return { error: resultado.error };
  if (resultado.pulou) {
    return { error: "Esse investidor não tem nenhum indicador vinculado — nada pra liberar." };
  }

  await prisma.logAuditoria.create({
    data: { userId: session.user.id, acao: "liberar_bonus_indicacao_manual", detalhes: aplicacaoId },
  });

  revalidatePath("/restrito/aportes");
  revalidatePath("/restrito/indicacoes");
  revalidatePath("/restrito/painel");
  return { sucesso: "Bônus de indicação liberado." };
}
