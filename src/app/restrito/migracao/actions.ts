"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calcularLiberacao } from "@/lib/carteira";
import { parseCsvMigracao, normalizarNome } from "@/lib/migracao";

export type MigracaoState = { error?: string; sucesso?: string } | undefined;

export async function importarMigracaoCsv(
  _prevState: MigracaoState,
  formData: FormData
): Promise<MigracaoState> {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") return { error: "Acesso negado." };
  const adminId = session.user.id;

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { error: "Selecione um arquivo CSV." };
  }

  const conteudo = await arquivo.text();
  const linhas = parseCsvMigracao(conteudo);
  if ("erro" in linhas) return { error: linhas.erro };
  if (linhas.length === 0) {
    return {
      error:
        "Nenhuma linha válida encontrada. Use as colunas: nome, documento (CPF/CNPJ), email, valor.",
    };
  }

  let aguardandoAprovacao = 0;
  let pendentes = 0;
  let semDocumento = 0;
  let jaMigradas = 0;
  let erros = 0;

  for (const linha of linhas) {
    if (!linha.nome || !linha.valor || Number.isNaN(linha.valor) || linha.valor <= 0) {
      erros++;
      continue;
    }

    const temDocumento = linha.documento.length === 11 || linha.documento.length === 14;

    if (!temDocumento) {
      const nomeNormalizado = normalizarNome(linha.nome);
      const existentes = await prisma.migracaoSaldo.findMany({
        where: { documento: null, status: { in: ["SEM_DOCUMENTO", "AGUARDANDO_APROVACAO"] } },
      });
      const jaExiste = existentes.some(
        (e) =>
          normalizarNome(e.nomeReferencia) === nomeNormalizado ||
          (linha.email && e.emailReferencia === linha.email)
      );
      if (jaExiste) {
        jaMigradas++;
        continue;
      }

      // Sem CPF na planilha: tenta achar a conta já existente pelo e-mail. Se achar, cai
      // direto em aguardando aprovação; se não achar, fica marcado pra lançamento manual
      // (o formulário manual já vem com esse e-mail preenchido).
      const usuarioPorEmail = linha.email
        ? await prisma.user.findUnique({ where: { email: linha.email } })
        : null;

      if (usuarioPorEmail) {
        await prisma.migracaoSaldo.create({
          data: {
            documento: null,
            nomeReferencia: linha.nome,
            emailReferencia: linha.email,
            valor: linha.valor,
            status: "AGUARDANDO_APROVACAO",
            userId: usuarioPorEmail.id,
            criadoPorId: adminId,
            observacao: `Sem CPF na planilha — encontrado pelo e-mail (${linha.email}). Confira o nome antes de aprovar.`,
          },
        });
        aguardandoAprovacao++;
      } else {
        await prisma.migracaoSaldo.create({
          data: {
            documento: null,
            nomeReferencia: linha.nome,
            emailReferencia: linha.email || null,
            valor: linha.valor,
            status: "SEM_DOCUMENTO",
            criadoPorId: adminId,
            observacao: linha.email
              ? `Planilha não trouxe CPF/CNPJ. Aguardando ${linha.email} se cadastrar.`
              : "Planilha não trouxe CPF/CNPJ nem e-mail. Conclua o cadastro da pessoa e lance manualmente.",
          },
        });
        semDocumento++;
      }
      continue;
    }

    const existente = await prisma.migracaoSaldo.findUnique({
      where: { documento: linha.documento },
    });
    if (existente && existente.status !== "CANCELADA") {
      jaMigradas++;
      continue;
    }

    const pf = await prisma.pessoaFisica.findUnique({ where: { cpf: linha.documento } });
    const pj = pf ? null : await prisma.pessoaJuridica.findUnique({ where: { cnpj: linha.documento } });
    const userId = pf?.userId ?? pj?.userId ?? null;
    const nomeCadastrado = pf?.nomeCompleto ?? pj?.razaoSocial ?? null;

    if (userId) {
      // Já existe conta com esse documento: nunca credita sozinho — fica aguardando o
      // admin conferir nome e valor e clicar em Aprovar ou Rejeitar.
      const nomeConfere = nomeCadastrado
        ? normalizarNome(nomeCadastrado) === normalizarNome(linha.nome)
        : false;

      await prisma.migracaoSaldo.upsert({
        where: { documento: linha.documento },
        create: {
          documento: linha.documento,
          nomeReferencia: linha.nome,
          emailReferencia: linha.email || null,
          valor: linha.valor,
          status: "AGUARDANDO_APROVACAO",
          userId,
          criadoPorId: adminId,
          observacao: nomeConfere
            ? undefined
            : `Nome da planilha ("${linha.nome}") diverge do cadastro ("${nomeCadastrado}"). Confira antes de aprovar.`,
        },
        update: {
          nomeReferencia: linha.nome,
          emailReferencia: linha.email || null,
          valor: linha.valor,
          status: "AGUARDANDO_APROVACAO",
          userId,
          observacao: nomeConfere
            ? null
            : `Nome da planilha ("${linha.nome}") diverge do cadastro ("${nomeCadastrado}"). Confira antes de aprovar.`,
        },
      });
      aguardandoAprovacao++;
    } else {
      await prisma.migracaoSaldo.upsert({
        where: { documento: linha.documento },
        create: {
          documento: linha.documento,
          nomeReferencia: linha.nome,
          emailReferencia: linha.email || null,
          valor: linha.valor,
          status: "PENDENTE",
          criadoPorId: adminId,
        },
        update: {
          nomeReferencia: linha.nome,
          emailReferencia: linha.email || null,
          valor: linha.valor,
          status: "PENDENTE",
        },
      });
      pendentes++;
    }
  }

  await prisma.logAuditoria.create({
    data: {
      userId: adminId,
      acao: "importar_migracao_csv",
      detalhes: `${aguardandoAprovacao} p/ aprovar, ${pendentes} pendentes, ${semDocumento} sem documento, ${jaMigradas} já migradas, ${erros} erros`,
    },
  });

  revalidatePath("/restrito/migracao");
  revalidatePath("/restrito/painel");

  const partes = [];
  if (aguardandoAprovacao > 0) partes.push(`${aguardandoAprovacao} aguardando sua aprovação`);
  if (pendentes > 0) partes.push(`${pendentes} pendente(s) aguardando cadastro`);
  if (semDocumento > 0) partes.push(`${semDocumento} sem CPF/CNPJ (lançamento manual)`);
  if (jaMigradas > 0) partes.push(`${jaMigradas} já migrada(s) anteriormente`);
  if (erros > 0) partes.push(`${erros} linha(s) com erro ignorada(s)`);

  return { sucesso: `Importação concluída: ${partes.join(", ") || "nenhuma linha válida"}.` };
}

export async function aprovarMigracao(id: string) {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") throw new Error("Acesso negado.");

  const migracao = await prisma.migracaoSaldo.findUnique({ where: { id } });
  if (!migracao || migracao.status !== "AGUARDANDO_APROVACAO" || !migracao.userId) {
    throw new Error("Esta migração não está mais aguardando aprovação.");
  }

  await prisma.$transaction(async (tx) => {
    const aplicacao = await tx.aplicacao.create({
      data: {
        userId: migracao.userId!,
        valor: migracao.valor,
        moeda: "BRL",
        origem: "MIGRACAO",
        status: "CONFIRMADA",
        liberaEm: calcularLiberacao(),
      },
    });
    await tx.migracaoSaldo.update({
      where: { id },
      data: { status: "APLICADA", aplicacaoId: aplicacao.id, aplicadoEm: new Date() },
    });
  });

  await prisma.logAuditoria.create({
    data: { userId: session.user.id, acao: "aprovar_migracao", detalhes: id },
  });

  revalidatePath("/restrito/migracao");
  revalidatePath("/restrito/painel");
}

export async function cancelarMigracaoPendente(id: string) {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") throw new Error("Acesso negado.");

  await prisma.migracaoSaldo.update({
    where: { id },
    data: { status: "CANCELADA" },
  });

  await prisma.logAuditoria.create({
    data: { userId: session.user.id, acao: "cancelar_migracao", detalhes: id },
  });

  revalidatePath("/restrito/migracao");
}

export type LancarManualState = { error?: string; sucesso?: string } | undefined;

export async function lancarMigracaoManual(
  _prevState: LancarManualState,
  formData: FormData
): Promise<LancarManualState> {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") return { error: "Acesso negado." };
  const adminId = session.user.id;

  const migracaoId = String(formData.get("migracaoId") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!migracaoId || !email) {
    return { error: "Informe o e-mail da conta do investidor." };
  }

  const migracao = await prisma.migracaoSaldo.findUnique({ where: { id: migracaoId } });
  if (!migracao || migracao.status === "APLICADA" || migracao.status === "CANCELADA") {
    return { error: "Esta migração não está mais disponível para lançamento." };
  }

  const usuario = await prisma.user.findUnique({ where: { email } });
  if (!usuario) {
    return {
      error: "Nenhuma conta encontrada com esse e-mail. Confirme se a pessoa já concluiu o cadastro.",
    };
  }

  await prisma.$transaction(async (tx) => {
    const aplicacao = await tx.aplicacao.create({
      data: {
        userId: usuario.id,
        valor: migracao.valor,
        moeda: "BRL",
        origem: "MIGRACAO",
        status: "CONFIRMADA",
        liberaEm: calcularLiberacao(),
      },
    });
    await tx.migracaoSaldo.update({
      where: { id: migracao.id },
      data: {
        status: "APLICADA",
        userId: usuario.id,
        aplicacaoId: aplicacao.id,
        aplicadoEm: new Date(),
      },
    });
  });

  await prisma.logAuditoria.create({
    data: {
      userId: adminId,
      acao: "lancar_migracao_manual",
      detalhes: `${migracaoId} -> ${email}`,
    },
  });

  revalidatePath("/restrito/migracao");
  revalidatePath("/restrito/painel");

  return { sucesso: `Saldo lançado na conta de ${usuario.name ?? usuario.email}.` };
}
