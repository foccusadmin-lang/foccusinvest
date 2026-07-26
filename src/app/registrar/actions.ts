"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword, validarForcaSenha } from "@/lib/password";
import { buildCodigoIndicacao } from "@/lib/codigo-indicacao";
import { signIn } from "@/auth";

export type RegistrarState = { error?: string } | undefined;

export async function registrarConta(
  _prevState: RegistrarState,
  formData: FormData
): Promise<RegistrarState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");
  const confirmarSenha = String(formData.get("confirmarSenha") ?? "");

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Informe um e-mail válido." };
  }

  const erroSenha = validarForcaSenha(senha);
  if (erroSenha) return { error: erroSenha };

  if (senha !== confirmarSenha) {
    return { error: "As senhas não coincidem." };
  }

  const existente = await prisma.user.findUnique({ where: { email } });
  if (existente) {
    return { error: "Já existe uma conta com este e-mail." };
  }

  const senhaHash = await hashPassword(senha);

  await prisma.user.create({
    data: {
      email,
      senha: senhaHash,
      codigoIndicacao: buildCodigoIndicacao(email.split("@")[0]),
    },
  });

  await signIn("credentials", {
    email,
    password: senha,
    redirectTo: "/pos-login",
  });
}
