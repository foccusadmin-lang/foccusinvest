"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type AtualizarDadosState = { error?: string; sucesso?: string } | undefined;

export async function atualizarDadosUsuario(
  _prevState: AtualizarDadosState,
  formData: FormData
): Promise<AtualizarDadosState> {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") return { error: "Acesso negado." };

  const userId = String(formData.get("userId") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const telefone = String(formData.get("telefone") ?? "").trim();
  const endereco = String(formData.get("endereco") ?? "").trim();

  if (!userId) return { error: "Usuário inválido." };
  if (!nome) return { error: "Informe o nome." };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Informe um e-mail válido." };
  }

  const usuario = await prisma.user.findUnique({
    where: { id: userId },
    include: { pessoaFisica: true, pessoaJuridica: true },
  });
  if (!usuario) return { error: "Usuário não encontrado." };

  const emailEmUso = await prisma.user.findUnique({ where: { email } });
  if (emailEmUso && emailEmUso.id !== userId) {
    return { error: "Este e-mail já está em uso por outra conta." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { email, name: nome } });
    if (usuario.pessoaFisica) {
      await tx.pessoaFisica.update({
        where: { userId },
        data: { nomeCompleto: nome, telefone, endereco },
      });
    }
    if (usuario.pessoaJuridica) {
      await tx.pessoaJuridica.update({
        where: { userId },
        data: { razaoSocial: nome, telefone, endereco },
      });
    }
  });

  await prisma.logAuditoria.create({
    data: {
      userId: session.user.id,
      acao: "atualizar_dados_usuario",
      detalhes: `${usuario.email} -> nome: ${nome}, e-mail: ${email}`,
    },
  });

  revalidatePath("/restrito/usuarios");

  return { sucesso: "Dados atualizados com sucesso." };
}

export async function excluirUsuario(userId: string): Promise<{ error?: string }> {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") return { error: "Acesso negado." };
  if (userId === session.user.id) return { error: "Você não pode excluir a própria conta." };

  const usuario = await prisma.user.findUnique({ where: { id: userId } });
  if (!usuario) return { error: "Usuário não encontrado." };
  if (usuario.perfil === "ADMIN") return { error: "Não é possível excluir uma conta administradora." };

  await prisma.user.delete({ where: { id: userId } });

  await prisma.logAuditoria.create({
    data: {
      userId: session.user.id,
      acao: "excluir_usuario",
      detalhes: usuario.email,
    },
  });

  revalidatePath("/restrito/usuarios");
  return {};
}
