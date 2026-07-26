"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword, validarForcaSenha } from "@/lib/password";

export type RedefinirState = { error?: string; sucesso?: boolean } | undefined;

export async function redefinirSenha(
  _prevState: RedefinirState,
  formData: FormData
): Promise<RedefinirState> {
  const token = String(formData.get("token") ?? "");
  const novaSenha = String(formData.get("novaSenha") ?? "");
  const confirmarSenha = String(formData.get("confirmarSenha") ?? "");

  if (!token) return { error: "Link inválido ou incompleto." };

  const erroSenha = validarForcaSenha(novaSenha);
  if (erroSenha) return { error: erroSenha };

  if (novaSenha !== confirmarSenha) {
    return { error: "As senhas não coincidem." };
  }

  const registro = await prisma.passwordResetToken.findUnique({ where: { token } });

  if (!registro || registro.usado || registro.expires < new Date()) {
    return { error: "Este link expirou ou já foi utilizado. Solicite um novo." };
  }

  const senhaHash = await hashPassword(novaSenha);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: registro.userId },
      data: { senha: senhaHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: registro.id },
      data: { usado: true },
    }),
  ]);

  return { sucesso: true };
}
