"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isValidCPF, isValidCNPJ, onlyDigits } from "@/lib/cpf-cnpj";
import { getConfiguracao } from "@/lib/configuracao";

export type AtualizarDadosState = { error?: string; sucesso?: string } | undefined;

async function statusAposCadastro(): Promise<"APROVADO" | "PENDENTE"> {
  const config = await getConfiguracao();
  return config.modoVerificacaoCadastro === "AUTOMATICO" ? "APROVADO" : "PENDENTE";
}

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
  const tipoPessoa = String(formData.get("tipoPessoa") ?? "");

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

  // Determina se vamos tratar como PF ou PJ: usa o que já existe, ou o que o admin
  // escolheu agora (só é editável quando o cadastro ainda está incompleto).
  const ehPF = usuario.pessoaFisica ? true : usuario.pessoaJuridica ? false : tipoPessoa === "FISICA";
  const ehPJ = usuario.pessoaJuridica ? true : usuario.pessoaFisica ? false : tipoPessoa === "JURIDICA";

  let cpf = "";
  let dataNascimento = "";
  let cnpj = "";
  let representanteLegal = "";
  let cpfRepresentante = "";

  if (ehPF) {
    cpf = onlyDigits(String(formData.get("cpf") ?? ""));
    dataNascimento = String(formData.get("dataNascimento") ?? "");

    if (!isValidCPF(cpf)) return { error: "CPF inválido." };
    if (!dataNascimento) return { error: "Informe a data de nascimento." };

    const cpfEmUso = await prisma.pessoaFisica.findUnique({ where: { cpf } });
    if (cpfEmUso && cpfEmUso.userId !== userId) {
      return {
        error:
          "Este CPF já está cadastrado em outra conta. Exclua ou corrija a conta duplicada antes de continuar.",
      };
    }
  } else if (ehPJ) {
    cnpj = onlyDigits(String(formData.get("cnpj") ?? ""));
    representanteLegal = String(formData.get("representanteLegal") ?? "").trim();
    cpfRepresentante = onlyDigits(String(formData.get("cpfRepresentante") ?? ""));

    if (!isValidCNPJ(cnpj)) return { error: "CNPJ inválido." };
    if (!representanteLegal) return { error: "Informe o representante legal." };
    if (!isValidCPF(cpfRepresentante)) return { error: "CPF do representante inválido." };

    const cnpjEmUso = await prisma.pessoaJuridica.findUnique({ where: { cnpj } });
    if (cnpjEmUso && cnpjEmUso.userId !== userId) {
      return {
        error:
          "Este CNPJ já está cadastrado em outra conta. Exclua ou corrija a conta duplicada antes de continuar.",
      };
    }
  } else {
    return { error: "Escolha se é Pessoa Física ou Jurídica pra completar o cadastro." };
  }

  const completandoCadastro = !usuario.pessoaFisica && !usuario.pessoaJuridica;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        email,
        name: nome,
        ...(completandoCadastro
          ? {
              tipoPessoa: ehPF ? "FISICA" : "JURIDICA",
              statusCadastro: await statusAposCadastro(),
            }
          : {}),
      },
    });

    if (ehPF) {
      await tx.pessoaFisica.upsert({
        where: { userId },
        create: {
          userId,
          nomeCompleto: nome,
          cpf,
          dataNascimento: new Date(dataNascimento),
          telefone,
          endereco,
        },
        update: { nomeCompleto: nome, cpf, dataNascimento: new Date(dataNascimento), telefone, endereco },
      });
    } else {
      await tx.pessoaJuridica.upsert({
        where: { userId },
        create: {
          userId,
          razaoSocial: nome,
          cnpj,
          representanteLegal,
          cpfRepresentante,
          telefone,
          endereco,
        },
        update: { razaoSocial: nome, cnpj, representanteLegal, cpfRepresentante, telefone, endereco },
      });
    }
  });

  await prisma.logAuditoria.create({
    data: {
      userId: session.user.id,
      acao: "atualizar_dados_usuario",
      detalhes: `${usuario.email} -> nome: ${nome}, e-mail: ${email}${completandoCadastro ? " | cadastro completado pelo admin" : ""}`,
    },
  });

  revalidatePath("/restrito/usuarios");

  return {
    sucesso: completandoCadastro
      ? "Cadastro completado! A pessoa já consegue entrar normalmente."
      : "Dados atualizados com sucesso.",
  };
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
