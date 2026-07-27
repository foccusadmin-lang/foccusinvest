"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isValidCPF, isValidCNPJ, onlyDigits } from "@/lib/cpf-cnpj";
import { getConfiguracao } from "@/lib/configuracao";
import { aplicarMigracaoPendente } from "@/lib/migracao";

export type CadastroState = { error?: string } | undefined;

async function statusAposCadastro(): Promise<"APROVADO" | "PENDENTE"> {
  const config = await getConfiguracao();
  return config.modoVerificacaoCadastro === "AUTOMATICO" ? "APROVADO" : "PENDENTE";
}

async function atualizarEmailSeNecessario(userId: string, email: string) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Informe um e-mail válido.";
  }

  const emailEmUso = await prisma.user.findUnique({ where: { email } });
  if (emailEmUso && emailEmUso.id !== userId) {
    return "Este e-mail já está em uso por outra conta.";
  }

  return null;
}

export async function completarCadastroPF(
  _prevState: CadastroState,
  formData: FormData
): Promise<CadastroState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const nomeCompleto = String(formData.get("nomeCompleto") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const cpf = onlyDigits(String(formData.get("cpf") ?? ""));
  const dataNascimento = String(formData.get("dataNascimento") ?? "");
  const telefone = String(formData.get("telefone") ?? "").trim();
  const endereco = String(formData.get("endereco") ?? "").trim();

  if (!nomeCompleto || nomeCompleto.length < 3) {
    return { error: "Informe seu nome completo." };
  }

  const erroEmail = await atualizarEmailSeNecessario(session.user.id, email);
  if (erroEmail) return { error: erroEmail };

  if (!isValidCPF(cpf)) {
    return { error: "CPF inválido." };
  }
  if (!dataNascimento) {
    return { error: "Informe sua data de nascimento." };
  }

  const cpfEmUso = await prisma.pessoaFisica.findUnique({ where: { cpf } });
  if (cpfEmUso && cpfEmUso.userId !== session.user.id) {
    return { error: "Este CPF já está cadastrado em outra conta." };
  }

  const status = await statusAposCadastro();
  await prisma.$transaction(async (tx) => {
    await tx.pessoaFisica.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        nomeCompleto,
        cpf,
        dataNascimento: new Date(dataNascimento),
        telefone,
        endereco,
      },
      update: {
        nomeCompleto,
        cpf,
        dataNascimento: new Date(dataNascimento),
        telefone,
        endereco,
      },
    });
    await tx.user.update({
      where: { id: session.user.id },
      data: { email, tipoPessoa: "FISICA", statusCadastro: status },
    });
    await aplicarMigracaoPendente(tx, session.user.id, cpf, nomeCompleto);
  });

  redirect("/painel");
}

export async function completarCadastroPJ(
  _prevState: CadastroState,
  formData: FormData
): Promise<CadastroState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const razaoSocial = String(formData.get("razaoSocial") ?? "").trim();
  const nomeFantasia = String(formData.get("nomeFantasia") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const cnpj = onlyDigits(String(formData.get("cnpj") ?? ""));
  const representanteLegal = String(formData.get("representanteLegal") ?? "").trim();
  const cpfRepresentante = onlyDigits(String(formData.get("cpfRepresentante") ?? ""));
  const telefone = String(formData.get("telefone") ?? "").trim();
  const endereco = String(formData.get("endereco") ?? "").trim();

  if (!razaoSocial || razaoSocial.length < 3) {
    return { error: "Informe a razão social." };
  }

  const erroEmail = await atualizarEmailSeNecessario(session.user.id, email);
  if (erroEmail) return { error: erroEmail };

  if (!isValidCNPJ(cnpj)) {
    return { error: "CNPJ inválido." };
  }
  if (!representanteLegal) {
    return { error: "Informe o representante legal." };
  }
  if (!isValidCPF(cpfRepresentante)) {
    return { error: "CPF do representante inválido." };
  }

  const cnpjEmUso = await prisma.pessoaJuridica.findUnique({ where: { cnpj } });
  if (cnpjEmUso && cnpjEmUso.userId !== session.user.id) {
    return { error: "Este CNPJ já está cadastrado em outra conta." };
  }

  const status = await statusAposCadastro();
  await prisma.$transaction(async (tx) => {
    await tx.pessoaJuridica.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        razaoSocial,
        nomeFantasia,
        cnpj,
        representanteLegal,
        cpfRepresentante,
        telefone,
        endereco,
      },
      update: {
        razaoSocial,
        nomeFantasia,
        cnpj,
        representanteLegal,
        cpfRepresentante,
        telefone,
        endereco,
      },
    });
    await tx.user.update({
      where: { id: session.user.id },
      data: { email, tipoPessoa: "JURIDICA", statusCadastro: status },
    });
    await aplicarMigracaoPendente(tx, session.user.id, cnpj, razaoSocial);
  });

  redirect("/painel");
}
