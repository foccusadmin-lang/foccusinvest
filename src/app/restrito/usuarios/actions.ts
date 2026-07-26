"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { PerfilUsuario, StatusCadastro } from "@prisma/client";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") {
    throw new Error("Acesso negado: ação restrita a administradores.");
  }
  return session;
}

async function registrarAuditoria(
  adminId: string,
  acao: string,
  detalhes: string
) {
  await prisma.logAuditoria.create({
    data: { userId: adminId, acao, detalhes },
  });
}

export async function alterarStatusCadastro(
  usuarioId: string,
  status: StatusCadastro
) {
  const session = await requireAdmin();
  await prisma.user.update({
    where: { id: usuarioId },
    data: { statusCadastro: status },
  });
  await registrarAuditoria(
    session.user.id,
    "alterar_status_cadastro",
    `usuario=${usuarioId} status=${status}`
  );
  revalidatePath("/restrito/usuarios");
}

export async function alterarPerfil(usuarioId: string, perfil: PerfilUsuario) {
  const session = await requireAdmin();
  await prisma.user.update({
    where: { id: usuarioId },
    data: { perfil },
  });
  await registrarAuditoria(
    session.user.id,
    "alterar_perfil",
    `usuario=${usuarioId} perfil=${perfil}`
  );
  revalidatePath("/restrito/usuarios");
}
