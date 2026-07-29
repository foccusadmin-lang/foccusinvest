"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildCodigoIndicacao } from "@/lib/codigo-indicacao";
import { vincularMigracaoPorEmail } from "@/lib/migracao";

export type CriarUsuarioState =
  | { error?: string; sucesso?: string; emailCriado?: string }
  | undefined;

export async function criarUsuarioPorEmail(
  _prevState: CriarUsuarioState,
  formData: FormData
): Promise<CriarUsuarioState> {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") return { error: "Acesso negado." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const nome = String(formData.get("nome") ?? "").trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Informe um e-mail válido." };
  }

  const existente = await prisma.user.findUnique({ where: { email } });
  if (existente) {
    return { error: "Já existe uma conta com este e-mail." };
  }

  const usuario = await prisma.user.create({
    data: {
      email,
      name: nome || null,
      codigoIndicacao: buildCodigoIndicacao(nome || email.split("@")[0]),
    },
  });

  await vincularMigracaoPorEmail(usuario.id, email);

  await prisma.logAuditoria.create({
    data: { userId: session.user.id, acao: "criar_usuario_por_email", detalhes: email },
  });

  revalidatePath("/restrito/usuarios");

  return {
    sucesso: `Conta criada para ${email}.`,
    emailCriado: email,
  };
}
