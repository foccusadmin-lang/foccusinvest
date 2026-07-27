"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatMoeda } from "@/lib/format";

export type AjusteSaldoState = { error?: string; sucesso?: string } | undefined;

const EPSILON = 0.005;
const ORIGEM_AJUSTE = "Ajuste manual (admin)";

function parseValor(raw: FormDataEntryValue | null): number {
  const texto = String(raw ?? "").trim().replace(/\./g, "").replace(",", ".");
  return Number(texto);
}

async function ajustarCapital(userId: string, valor: number, operacao: string): Promise<string | null> {
  if (operacao === "ADICIONAR") {
    await prisma.aplicacao.create({
      data: {
        userId,
        valor,
        moeda: "BRL",
        origem: "AJUSTE_ADMIN",
        status: "CONFIRMADA",
        liberaEm: new Date(),
      },
    });
    return null;
  }

  const atual = await prisma.aplicacao.aggregate({
    where: { userId, status: { in: ["CONFIRMADA", "SAQUE_SOLICITADO"] } },
    _sum: { valor: true },
  });
  const valorAtual = atual._sum.valor ?? 0;
  const delta = valor - valorAtual;

  if (delta < -EPSILON) {
    return `Capital atual (${formatMoeda(valorAtual)}) já é maior que ${formatMoeda(valor)}. Para reduzir, use um saque ou cancelamento manual.`;
  }
  if (delta > EPSILON) {
    await prisma.aplicacao.create({
      data: {
        userId,
        valor: delta,
        moeda: "BRL",
        origem: "AJUSTE_ADMIN",
        status: "CONFIRMADA",
        liberaEm: new Date(),
      },
    });
  }
  return null;
}

async function ajustarCredito(
  userId: string,
  tipo: "RENDIMENTO" | "BONUS",
  valor: number,
  operacao: string
): Promise<string | null> {
  if (operacao === "ADICIONAR") {
    await prisma.creditoCarteira.create({
      data: { userId, tipo, valor, moeda: "BRL", origem: ORIGEM_AJUSTE },
    });
    return null;
  }

  const atual = await prisma.creditoCarteira.aggregate({
    where: { userId, tipo, utilizadoEm: null, solicitacaoSaqueId: null },
    _sum: { valor: true },
  });
  const valorAtual = atual._sum.valor ?? 0;
  const delta = valor - valorAtual;

  if (delta < -EPSILON) {
    return `Saldo atual (${formatMoeda(valorAtual)}) já é maior que ${formatMoeda(valor)}. Para reduzir, ajuste manualmente pelo banco ou processe um saque.`;
  }
  if (delta > EPSILON) {
    await prisma.creditoCarteira.create({
      data: { userId, tipo, valor: delta, moeda: "BRL", origem: ORIGEM_AJUSTE },
    });
  }
  return null;
}

export async function ajustarSaldoUsuario(
  _prevState: AjusteSaldoState,
  formData: FormData
): Promise<AjusteSaldoState> {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") return { error: "Acesso negado." };

  const userId = String(formData.get("userId") ?? "");
  const operacao = String(formData.get("operacao") ?? "");
  const valor = parseValor(formData.get("valor"));
  const tipos = formData.getAll("tipos").map(String);

  if (!userId) return { error: "Usuário inválido." };
  if (operacao !== "ADICIONAR" && operacao !== "DEFINIR") {
    return { error: "Operação inválida." };
  }
  if (!valor || valor <= 0 || Number.isNaN(valor)) {
    return { error: "Informe um valor válido." };
  }
  if (tipos.length === 0) {
    return { error: "Selecione ao menos um tipo de saldo para ajustar." };
  }

  const usuario = await prisma.user.findUnique({ where: { id: userId } });
  if (!usuario) return { error: "Usuário não encontrado." };

  for (const tipo of tipos) {
    let erro: string | null = null;
    if (tipo === "CAPITAL") erro = await ajustarCapital(userId, valor, operacao);
    else if (tipo === "RENDIMENTO") erro = await ajustarCredito(userId, "RENDIMENTO", valor, operacao);
    else if (tipo === "BONUS") erro = await ajustarCredito(userId, "BONUS", valor, operacao);

    if (erro) return { error: erro };
  }

  await prisma.logAuditoria.create({
    data: {
      userId: session.user.id,
      acao: "ajustar_saldo_usuario",
      detalhes: `${usuario.email} | ${operacao} ${formatMoeda(valor)} em ${tipos.join(", ")}`,
    },
  });

  revalidatePath("/restrito/usuarios");
  revalidatePath("/restrito/painel");

  return { sucesso: `Saldo de ${usuario.name ?? usuario.email} atualizado.` };
}

export async function alternarSaqueEmergencial(userId: string, liberado: boolean) {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") throw new Error("Acesso negado.");

  const usuario = await prisma.user.update({
    where: { id: userId },
    data: { saqueEmergencialLiberado: liberado },
  });

  await prisma.logAuditoria.create({
    data: {
      userId: session.user.id,
      acao: liberado ? "liberar_saque_emergencial" : "bloquear_saque_emergencial",
      detalhes: usuario.email,
    },
  });

  revalidatePath("/restrito/usuarios");
}
