"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isValidCPF, isValidCNPJ, onlyDigits } from "@/lib/cpf-cnpj";

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
  const nome = String(formData.get("nome") ?? "").trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Informe um e-mail válido." };
  }
  if (!nome) {
    return { error: "Informe o nome." };
  }

  const emailEmUso = await prisma.user.findUnique({ where: { email } });
  if (emailEmUso && emailEmUso.id !== session.user.id) {
    return { error: "Este e-mail já está em uso por outra conta." };
  }

  const usuario = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { pessoaFisica: true, pessoaJuridica: true },
  });
  if (!usuario) return { error: "Usuário não encontrado." };

  if (usuario.pessoaFisica) {
    const cpf = onlyDigits(String(formData.get("cpf") ?? ""));
    const dataNascimento = String(formData.get("dataNascimento") ?? "");

    if (!isValidCPF(cpf)) return { error: "CPF inválido." };
    if (!dataNascimento) return { error: "Informe a data de nascimento." };

    const cpfEmUso = await prisma.pessoaFisica.findUnique({ where: { cpf } });
    if (cpfEmUso && cpfEmUso.userId !== session.user.id) {
      return { error: "Este CPF já está cadastrado em outra conta." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: session.user.id }, data: { email, name: nome } });
      await tx.pessoaFisica.update({
        where: { userId: session.user.id },
        data: { telefone, endereco, nomeCompleto: nome, cpf, dataNascimento: new Date(dataNascimento) },
      });
    });
  } else if (usuario.pessoaJuridica) {
    const cnpj = onlyDigits(String(formData.get("cnpj") ?? ""));
    const representanteLegal = String(formData.get("representanteLegal") ?? "").trim();
    const cpfRepresentante = onlyDigits(String(formData.get("cpfRepresentante") ?? ""));

    if (!isValidCNPJ(cnpj)) return { error: "CNPJ inválido." };
    if (!representanteLegal) return { error: "Informe o representante legal." };
    if (!isValidCPF(cpfRepresentante)) return { error: "CPF do representante inválido." };

    const cnpjEmUso = await prisma.pessoaJuridica.findUnique({ where: { cnpj } });
    if (cnpjEmUso && cnpjEmUso.userId !== session.user.id) {
      return { error: "Este CNPJ já está cadastrado em outra conta." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: session.user.id }, data: { email, name: nome } });
      await tx.pessoaJuridica.update({
        where: { userId: session.user.id },
        data: { telefone, endereco, razaoSocial: nome, cnpj, representanteLegal, cpfRepresentante },
      });
    });
  } else {
    return { error: "Complete seu cadastro primeiro." };
  }

  revalidatePath("/painel/configuracoes");

  return { sucesso: "Dados atualizados com sucesso." };
}
