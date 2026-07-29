"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type DadosState = { error?: string; sucesso?: string } | undefined;

export async function atualizarDadosPessoais(
  _prevState: DadosState,
  formData: FormData
): Promise<DadosState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autenticado." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const telefone = String(formData.get("telefone") ?? "").trim();
  const endereco = String(formData.get("endereco") ?? "").trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Informe um e-mail válido." };
  }

  const emailEmUso = await prisma.user.findUnique({ where: { email } });
  if (emailEmUso && emailEmUso.id !== session.user.id) {
    return { error: "Este e-mail já está em uso por outra conta." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: session.user.id }, data: { email } });
    await tx.pessoaFisica.updateMany({
      where: { userId: session.user.id },
      data: { telefone, endereco },
    });
    await tx.pessoaJuridica.updateMany({
      where: { userId: session.user.id },
      data: { telefone, endereco },
    });
  });

  revalidatePath("/painel/configuracoes");

  return { sucesso: "Dados atualizados com sucesso." };
}
