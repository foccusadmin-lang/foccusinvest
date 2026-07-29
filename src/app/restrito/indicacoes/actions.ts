"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildCodigoIndicacao } from "@/lib/codigo-indicacao";

export type CodigoState = { error?: string; sucesso?: string } | undefined;

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") throw new Error("Acesso negado.");
  return session.user;
}

function normalizarCodigo(bruto: string): string {
  return bruto
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "");
}

export async function alterarCodigoIndicacao(
  _prevState: CodigoState,
  formData: FormData
): Promise<CodigoState> {
  const admin = await requireAdmin();

  const userId = String(formData.get("userId") ?? "");
  const novoCodigo = normalizarCodigo(String(formData.get("codigo") ?? ""));

  if (!userId) return { error: "Usuário inválido." };
  if (!novoCodigo || novoCodigo.length < 3) {
    return { error: "Informe um código válido (mínimo 3 caracteres)." };
  }

  const emUso = await prisma.user.findUnique({ where: { codigoIndicacao: novoCodigo } });
  if (emUso && emUso.id !== userId) {
    return { error: "Esse código já está em uso por outra conta." };
  }

  const usuario = await prisma.user.update({
    where: { id: userId },
    data: { codigoIndicacao: novoCodigo },
  });

  await prisma.logAuditoria.create({
    data: {
      userId: admin.id,
      acao: "alterar_codigo_indicacao",
      detalhes: `${usuario.email} -> ${novoCodigo}`,
    },
  });

  revalidatePath("/restrito/indicacoes");

  return { sucesso: `Código de ${usuario.name ?? usuario.email} atualizado para ${novoCodigo}.` };
}

export async function removerCodigoIndicacao(userId: string) {
  const admin = await requireAdmin();

  const usuario = await prisma.user.update({
    where: { id: userId },
    data: { codigoIndicacao: null },
  });

  await prisma.logAuditoria.create({
    data: { userId: admin.id, acao: "remover_codigo_indicacao", detalhes: usuario.email },
  });

  revalidatePath("/restrito/indicacoes");
}

export async function gerarNovoCodigoIndicacao(userId: string) {
  const admin = await requireAdmin();

  const usuario = await prisma.user.findUnique({ where: { id: userId } });
  if (!usuario) throw new Error("Usuário não encontrado.");

  let novoCodigo = "";
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const candidato = buildCodigoIndicacao(usuario.name ?? usuario.email);
    const emUso = await prisma.user.findUnique({ where: { codigoIndicacao: candidato } });
    if (!emUso) {
      novoCodigo = candidato;
      break;
    }
  }
  if (!novoCodigo) throw new Error("Não foi possível gerar um código único, tente de novo.");

  await prisma.user.update({ where: { id: userId }, data: { codigoIndicacao: novoCodigo } });

  await prisma.logAuditoria.create({
    data: {
      userId: admin.id,
      acao: "gerar_codigo_indicacao",
      detalhes: `${usuario.email} -> ${novoCodigo}`,
    },
  });

  revalidatePath("/restrito/indicacoes");
}
