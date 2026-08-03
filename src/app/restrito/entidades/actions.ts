"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isValidCNPJ, isValidCPF, onlyDigits } from "@/lib/cpf-cnpj";
import { buildCodigoIndicacao } from "@/lib/codigo-indicacao";
import { ativarEntidade, TAXA_ATIVACAO_PADRAO } from "@/lib/entidades";

export type EntidadeState = { error?: string; sucesso?: string } | undefined;

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") throw new Error("Acesso negado.");
  return session.user;
}

async function ipDoPedido(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

export async function criarEntidade(
  _prevState: EntidadeState,
  formData: FormData
): Promise<EntidadeState> {
  const admin = await requireAdmin();

  const razaoSocial = String(formData.get("razaoSocial") ?? "").trim();
  const nomeFantasia = String(formData.get("nomeFantasia") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const cnpj = onlyDigits(String(formData.get("cnpj") ?? ""));
  const tipoEntidade = String(formData.get("tipoEntidade") ?? "OUTRO");
  const representanteLegal = String(formData.get("representanteLegal") ?? "").trim();
  const cpfRepresentante = onlyDigits(String(formData.get("cpfRepresentante") ?? ""));
  const telefone = String(formData.get("telefone") ?? "").trim();
  const endereco = String(formData.get("endereco") ?? "").trim();
  const cidade = String(formData.get("cidade") ?? "").trim();
  const estado = String(formData.get("estado") ?? "").trim();
  const chavePix = String(formData.get("chavePix") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const taxaAtivacao = Number(String(formData.get("taxaAtivacao") ?? TAXA_ATIVACAO_PADRAO).replace(",", "."));

  if (!razaoSocial) return { error: "Informe a razão social." };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Informe um e-mail válido." };
  if (!isValidCNPJ(cnpj)) return { error: "CNPJ inválido." };
  if (!representanteLegal) return { error: "Informe o nome do responsável legal." };
  if (!isValidCPF(cpfRepresentante)) return { error: "CPF do responsável inválido." };
  if (Number.isNaN(taxaAtivacao) || taxaAtivacao < 0) return { error: "Taxa de ativação inválida." };

  const emailEmUso = await prisma.user.findUnique({ where: { email } });
  if (emailEmUso) return { error: "Já existe uma conta com esse e-mail." };
  const cnpjEmUso = await prisma.pessoaJuridica.findUnique({ where: { cnpj } });
  if (cnpjEmUso) return { error: "Esse CNPJ já está cadastrado." };

  await prisma.$transaction(async (tx) => {
    const usuario = await tx.user.create({
      data: {
        email,
        name: nomeFantasia || razaoSocial,
        perfil: "ENTIDADE",
        tipoPessoa: "JURIDICA",
        statusCadastro: "APROVADO",
        codigoIndicacao: buildCodigoIndicacao(nomeFantasia || razaoSocial),
      },
    });

    await tx.pessoaJuridica.create({
      data: {
        userId: usuario.id,
        razaoSocial,
        nomeFantasia: nomeFantasia || null,
        cnpj,
        representanteLegal,
        cpfRepresentante,
        telefone,
        endereco,
      },
    });

    await tx.entidade.create({
      data: {
        userId: usuario.id,
        tipoEntidade: tipoEntidade as never,
        descricao: descricao || null,
        cidade: cidade || null,
        estado: estado || null,
        chavePix: chavePix || null,
        taxaAtivacao,
        status: "EM_ANALISE",
      },
    });

    await tx.logAuditoria.create({
      data: { userId: admin.id, acao: "criar_entidade", detalhes: `${razaoSocial} | ${email}` },
    });
  });

  revalidatePath("/restrito/entidades");
  return { sucesso: `Entidade "${razaoSocial}" cadastrada. Falta aprovar documentos, termos e ativar.` };
}

export async function marcarDocumentosAprovados(entidadeId: string, aprovado: boolean) {
  const admin = await requireAdmin();
  const entidade = await prisma.entidade.update({
    where: { id: entidadeId },
    data: { documentosAprovados: aprovado },
  });
  await prisma.logAuditoria.create({
    data: {
      userId: admin.id,
      acao: aprovado ? "aprovar_documentos_entidade" : "reprovar_documentos_entidade",
      detalhes: entidadeId,
    },
  });
  revalidatePath("/restrito/entidades");
  return entidade;
}

export async function marcarTermosAceitos(entidadeId: string, aceito: boolean) {
  const admin = await requireAdmin();
  await prisma.entidade.update({ where: { id: entidadeId }, data: { termosAceitos: aceito } });
  await prisma.logAuditoria.create({
    data: {
      userId: admin.id,
      acao: aceito ? "marcar_termos_aceitos_entidade" : "desmarcar_termos_aceitos_entidade",
      detalhes: entidadeId,
    },
  });
  revalidatePath("/restrito/entidades");
}

export async function definirTaxaAtivacao(entidadeId: string, taxa: number) {
  const admin = await requireAdmin();
  if (Number.isNaN(taxa) || taxa < 0) throw new Error("Taxa inválida.");
  await prisma.entidade.update({ where: { id: entidadeId }, data: { taxaAtivacao: taxa } });
  await prisma.logAuditoria.create({
    data: { userId: admin.id, acao: "definir_taxa_ativacao_entidade", detalhes: `${entidadeId} -> ${taxa}` },
  });
  revalidatePath("/restrito/entidades");
}

export async function ativarEntidadeAction(entidadeId: string): Promise<EntidadeState> {
  const admin = await requireAdmin();
  const ip = await ipDoPedido();

  const resultado = await ativarEntidade(entidadeId, admin.id, ip);
  if (resultado.error) return { error: resultado.error };

  revalidatePath("/restrito/entidades");
  return { sucesso: "Entidade ativada com sucesso e habilitada para receber doações e aplicações." };
}

const STATUS_MANUAIS = ["BLOQUEADA", "SUSPENSA", "INATIVA", "ATIVA"] as const;

export async function alterarStatusEntidade(
  entidadeId: string,
  status: (typeof STATUS_MANUAIS)[number]
) {
  const admin = await requireAdmin();
  if (!STATUS_MANUAIS.includes(status)) throw new Error("Status inválido.");

  const podeReceber = status === "ATIVA";
  await prisma.entidade.update({
    where: { id: entidadeId },
    data: { status, podeReceberDoacao: podeReceber, podeReceberAplicacao: podeReceber },
  });

  await prisma.logAuditoria.create({
    data: { userId: admin.id, acao: "alterar_status_entidade", detalhes: `${entidadeId} -> ${status}` },
  });

  revalidatePath("/restrito/entidades");
  revalidatePath("/painel/doar");
}
