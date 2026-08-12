"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatMoeda } from "@/lib/format";
import {
  adicionarIncentivoLideranca,
  definirIncentivoLideranca,
  zerarIncentivoLideranca,
} from "@/lib/incentivo-lideranca";

export type LiderancaState = { error?: string; sucesso?: string } | undefined;

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") throw new Error("Acesso negado.");
  return session.user;
}

function parseValor(raw: FormDataEntryValue | null): number {
  const texto = String(raw ?? "").trim().replace(/\./g, "").replace(",", ".");
  return Number(texto);
}

function revalidarTudo() {
  revalidatePath("/restrito/lideranca");
  revalidatePath("/restrito/usuarios");
  revalidatePath("/painel");
}

export async function promoverLiderAction(
  _prevState: LiderancaState,
  formData: FormData
): Promise<LiderancaState> {
  const admin = await requireAdmin();
  const codigoOuEmail = String(formData.get("codigoOuEmail") ?? "").trim();
  if (!codigoOuEmail) return { error: "Informe o código de indicação ou e-mail do investidor." };

  const usuario = await prisma.user.findFirst({
    where: {
      OR: [
        { codigoIndicacao: codigoOuEmail.toUpperCase() },
        { email: codigoOuEmail.toLowerCase() },
      ],
    },
  });
  if (!usuario) return { error: "Nenhum investidor encontrado com esse código ou e-mail." };
  if (usuario.perfil === "ADMIN") return { error: "Não é possível promover um administrador." };
  if (usuario.perfil === "LIDER") return { error: "Esse investidor já é líder." };

  await prisma.user.update({ where: { id: usuario.id }, data: { perfil: "LIDER" } });
  await prisma.logAuditoria.create({
    data: { userId: admin.id, acao: "promover_lider", detalhes: usuario.email },
  });

  revalidarTudo();
  return { sucesso: `${usuario.name ?? usuario.email} promovido a líder.` };
}

export async function removerLiderancaAction(userId: string) {
  const admin = await requireAdmin();
  const usuario = await prisma.user.update({ where: { id: userId }, data: { perfil: "USUARIO" } });
  await prisma.logAuditoria.create({
    data: { userId: admin.id, acao: "remover_lideranca", detalhes: usuario.email },
  });
  revalidarTudo();
}

export async function gerenciarIncentivoAction(
  _prevState: LiderancaState,
  formData: FormData
): Promise<LiderancaState> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const operacao = String(formData.get("operacao") ?? "");
  if (!userId) return { error: "Usuário inválido." };
  if (!["ADICIONAR", "DEFINIR", "EXCLUIR"].includes(operacao)) {
    return { error: "Operação inválida." };
  }

  const usuario = await prisma.user.findUnique({ where: { id: userId } });
  if (!usuario) return { error: "Usuário não encontrado." };
  if (usuario.perfil !== "LIDER") {
    return { error: "Incentivo de liderança só pode ser ajustado pra quem é líder." };
  }

  if (operacao === "EXCLUIR") {
    const erro = await zerarIncentivoLideranca(userId);
    if (erro) return { error: erro };

    await prisma.logAuditoria.create({
      data: { userId: admin.id, acao: "excluir_incentivo_lideranca", detalhes: usuario.email },
    });
    revalidarTudo();
    return { sucesso: `Incentivo de liderança de ${usuario.name ?? usuario.email} zerado.` };
  }

  const valor = parseValor(formData.get("valor"));
  if (!valor || valor < 0 || Number.isNaN(valor)) return { error: "Informe um valor válido." };

  if (operacao === "ADICIONAR") {
    await adicionarIncentivoLideranca(userId, valor);
  } else {
    const erro = await definirIncentivoLideranca(userId, valor);
    if (erro) return { error: erro };
  }

  await prisma.logAuditoria.create({
    data: {
      userId: admin.id,
      acao: "ajustar_incentivo_lideranca",
      detalhes: `${usuario.email} | ${operacao} | ${formatMoeda(valor)}`,
    },
  });
  revalidarTudo();
  return { sucesso: `Incentivo de liderança de ${usuario.name ?? usuario.email} atualizado.` };
}
