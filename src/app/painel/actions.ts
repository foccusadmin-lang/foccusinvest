"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatMoeda } from "@/lib/format";
import {
  calcularLiberacao,
  reservarCapitalParaSaque,
  reservarCapitalParaSaqueEmergencial,
  reservarCreditosParaSaque,
  reaplicarSaldoDisponivel,
  SaldoInsuficienteError,
  TAXA_ANTECIPACAO,
} from "@/lib/carteira";
import { getConfiguracao } from "@/lib/configuracao";
import { janelaSaqueRendimentoAberta, MENSAGEM_JANELA_FECHADA } from "@/lib/janela-saque";
import { valorPorExtenso } from "@/lib/valor-extenso";
import { enviarEmailContrato } from "@/lib/email";
import { guardarCodigoIndicadorPendente } from "@/lib/indicacao";

export type AcaoState = { error?: string; sucesso?: string } | undefined;

function parseValor(raw: FormDataEntryValue | null): number {
  const texto = String(raw ?? "").trim().replace(/\./g, "").replace(",", ".");
  return Number(texto);
}

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado.");
  if (session.user.statusCadastro === "INCOMPLETO") {
    throw new Error("Complete seu cadastro antes de movimentar a carteira.");
  }
  return session.user.id;
}

/** Saques exigem cadastro completo e verificado (aprovado) — não basta ter só enviado os dados. */
async function requireVerifiedUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado.");
  if (session.user.statusCadastro !== "APROVADO") {
    throw new Error(
      "Você precisa completar o cadastro e ser verificado pelo administrador antes de sacar."
    );
  }
  return session.user.id;
}

const VALOR_MINIMO_APLICACAO = 50;
const VALOR_MINIMO_REAPLICACAO = 100;

const TAMANHO_MAXIMO_COMPROVANTE = 5 * 1024 * 1024;

export async function criarAplicacao(
  _prevState: AcaoState,
  formData: FormData
): Promise<AcaoState> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const valor = parseValor(formData.get("valor"));
  if (!valor || valor <= 0 || Number.isNaN(valor)) {
    return { error: "Informe um valor válido." };
  }
  if (valor < VALOR_MINIMO_APLICACAO) {
    return { error: `O valor mínimo de aplicação é ${formatMoeda(VALOR_MINIMO_APLICACAO)}.` };
  }

  const comprovante = formData.get("comprovante");
  if (!(comprovante instanceof File) || comprovante.size === 0) {
    return { error: "Envie o comprovante de pagamento do Pix." };
  }
  if (comprovante.size > TAMANHO_MAXIMO_COMPROVANTE) {
    return { error: "Arquivo muito grande. Envie um comprovante de até 5MB." };
  }

  const codigoIndicador = String(formData.get("codigoIndicador") ?? "").trim().toUpperCase();
  if (codigoIndicador) {
    const indicador = await prisma.user.findUnique({ where: { codigoIndicacao: codigoIndicador } });
    if (!indicador) return { error: "Código de indicação não encontrado." };
    if (indicador.id === userId) {
      return { error: "Você não pode usar o seu próprio código de indicação." };
    }
  }

  const usuario = await prisma.user.findUnique({
    where: { id: userId },
    include: { pessoaFisica: true, pessoaJuridica: true },
  });
  if (!usuario) return { error: "Usuário não encontrado." };
  if (!usuario.pessoaFisica && !usuario.pessoaJuridica) {
    return { error: "Complete seu cadastro antes de aplicar." };
  }

  const nomeContrato = usuario.pessoaFisica?.nomeCompleto ?? usuario.pessoaJuridica!.representanteLegal;
  const cpfContrato = usuario.pessoaFisica?.cpf ?? usuario.pessoaJuridica!.cpfRepresentante;
  const rg = usuario.pessoaFisica?.rg ?? usuario.pessoaJuridica?.rgRepresentante ?? null;
  const nacionalidade =
    usuario.pessoaFisica?.nacionalidade ?? usuario.pessoaJuridica?.nacionalidadeRepresentante ?? null;
  const estadoCivil =
    usuario.pessoaFisica?.estadoCivil ?? usuario.pessoaJuridica?.estadoCivilRepresentante ?? null;
  const profissao =
    usuario.pessoaFisica?.profissao ?? usuario.pessoaJuridica?.profissaoRepresentante ?? null;
  const telefone = usuario.pessoaFisica?.telefone ?? usuario.pessoaJuridica?.telefone ?? null;
  const endereco = usuario.pessoaFisica?.endereco ?? usuario.pessoaJuridica?.endereco ?? null;
  const valorExtenso = valorPorExtenso(valor);

  const bytes = Buffer.from(await comprovante.arrayBuffer());

  await prisma.$transaction(async (tx) => {
    const aplicacao = await tx.aplicacao.create({
      data: {
        userId,
        valor,
        moeda: "BRL",
        status: "AGUARDANDO_APROVACAO",
        liberaEm: calcularLiberacao(),
        comprovante: bytes,
        comprovanteNome: comprovante.name,
        comprovanteTipo: comprovante.type || "application/octet-stream",
        // Guarda o código de indicação até a aprovação — só é lido e limpo em aprovarAporte,
        // que credita o bônus. Nunca aparece pro investidor (só é exibido p/ REJEITADA).
        motivoRejeicao: codigoIndicador ? guardarCodigoIndicadorPendente(codigoIndicador) : null,
      },
    });

    await tx.contrato.create({
      data: {
        userId,
        aplicacaoId: aplicacao.id,
        nome: nomeContrato,
        email: usuario.email,
        cpf: cpfContrato,
        rg,
        nacionalidade,
        estadoCivil,
        profissao,
        telefone,
        endereco,
        valor,
        valorExtenso,
        confirmouLeituraEm: new Date(),
      },
    });
  });

  await enviarEmailContrato({
    nome: nomeContrato,
    email: usuario.email,
    cpf: cpfContrato,
    rg,
    nacionalidade,
    estadoCivil,
    profissao,
    telefone,
    endereco,
    valor,
    valorExtenso,
    data: new Date(),
  });

  revalidatePath("/painel");
  return {
    sucesso: `Comprovante de ${formatMoeda(valor)} enviado! Assim que o admin confirmar o pagamento, o valor entra na sua carteira com carência de 90 dias. O contrato foi enviado para o seu e-mail.`,
  };
}

export async function solicitarSaqueCapital(
  _prevState: AcaoState,
  formData: FormData
): Promise<AcaoState> {
  let userId: string;
  try {
    userId = await requireVerifiedUserId();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const valor = parseValor(formData.get("valor"));
  if (!valor || valor <= 0 || Number.isNaN(valor)) {
    return { error: "Informe um valor válido." };
  }

  const chavePix = String(formData.get("chavePix") ?? "").trim();
  if (!chavePix) {
    return { error: "Informe a chave Pix para receber o saque." };
  }

  const config = await getConfiguracao();
  const automatico = config.modoSaqueCapital === "AUTOMATICO";

  try {
    await prisma.$transaction(async (tx) => {
      const saque = await tx.solicitacaoSaque.create({
        // Reaproveita motivoEmergencia (só usado em saques emergenciais) pra guardar a
        // chave Pix nos saques normais, sem precisar de coluna nova no banco.
        data: { userId, tipo: "CAPITAL", valor, moeda: "BRL", motivoEmergencia: chavePix },
      });
      await reservarCapitalParaSaque(tx, userId, valor, saque.id);

      if (automatico) {
        await tx.aplicacao.updateMany({
          where: { solicitacaoSaqueId: saque.id },
          data: { status: "RETIRADA" },
        });
        await tx.solicitacaoSaque.update({
          where: { id: saque.id },
          data: { status: "PAGO", processadoEm: new Date() },
        });
      }
    });
  } catch (e) {
    if (e instanceof SaldoInsuficienteError) {
      return { error: e.message };
    }
    throw e;
  }

  revalidatePath("/painel");
  return {
    sucesso: automatico
      ? `Saque de ${formatMoeda(valor)} processado automaticamente.`
      : `Saque de ${formatMoeda(valor)} solicitado. Aguarde aprovação.`,
  };
}

export async function solicitarSaqueRendimento(
  _prevState: AcaoState,
  formData: FormData
): Promise<AcaoState> {
  let userId: string;
  try {
    userId = await requireVerifiedUserId();
  } catch (e) {
    return { error: (e as Error).message };
  }

  if (!janelaSaqueRendimentoAberta()) {
    return { error: MENSAGEM_JANELA_FECHADA };
  }

  const valor = parseValor(formData.get("valor"));
  if (!valor || valor <= 0 || Number.isNaN(valor)) {
    return { error: "Informe um valor válido." };
  }

  const chavePix = String(formData.get("chavePix") ?? "").trim();
  if (!chavePix) {
    return { error: "Informe a chave Pix para receber o saque." };
  }

  const config = await getConfiguracao();
  const automatico = config.modoSaqueRendimento === "AUTOMATICO";

  try {
    await prisma.$transaction(async (tx) => {
      const saque = await tx.solicitacaoSaque.create({
        // Reaproveita motivoEmergencia (só usado em saques emergenciais) pra guardar a
        // chave Pix nos saques normais, sem precisar de coluna nova no banco.
        data: { userId, tipo: "RENDIMENTO", valor, moeda: "BRL", motivoEmergencia: chavePix },
      });
      await reservarCreditosParaSaque(tx, userId, valor, "RENDIMENTO", saque.id);

      if (automatico) {
        await tx.creditoCarteira.updateMany({
          where: { solicitacaoSaqueId: saque.id },
          data: { utilizadoEm: new Date() },
        });
        await tx.solicitacaoSaque.update({
          where: { id: saque.id },
          data: { status: "PAGO", processadoEm: new Date() },
        });
      }
    });
  } catch (e) {
    if (e instanceof SaldoInsuficienteError) {
      return { error: e.message };
    }
    throw e;
  }

  revalidatePath("/painel");
  return {
    sucesso: automatico
      ? `Saque de rendimentos de ${formatMoeda(valor)} processado automaticamente.`
      : `Saque de rendimentos de ${formatMoeda(valor)} solicitado. Aguarde aprovação.`,
  };
}

export type OrigemSaqueEmergencia = "CAPITAL" | "DISPONIVEL" | "RENDIMENTO" | "BONUS";

export async function solicitarSaqueEmergencia(
  _prevState: AcaoState,
  formData: FormData
): Promise<AcaoState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autenticado." };
  if (session.user.statusCadastro !== "APROVADO") {
    return {
      error: "Você precisa completar o cadastro e ser verificado pelo administrador antes de sacar.",
    };
  }

  const usuarioAtual = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!usuarioAtual?.saqueEmergencialLiberado) {
    return {
      error: "O saque de emergência não está liberado para sua conta no momento. Entre em contato com o administrador.",
    };
  }

  const userId = session.user.id;
  const origem = String(formData.get("origem") ?? "") as OrigemSaqueEmergencia;
  const valorBruto = parseValor(formData.get("valor"));
  const motivo = String(formData.get("motivo") ?? "").trim();

  if (!["CAPITAL", "DISPONIVEL", "RENDIMENTO", "BONUS"].includes(origem)) {
    return { error: "Selecione a origem do saque." };
  }
  if (!valorBruto || valorBruto <= 0 || Number.isNaN(valorBruto)) {
    return { error: "Informe um valor válido." };
  }
  if (motivo.length < 10) {
    return { error: "Descreva o motivo da emergência (mínimo 10 caracteres) — fica registrado para auditoria." };
  }

  const temTaxa = origem === "CAPITAL";
  const taxaAntecipacao = temTaxa ? valorBruto * TAXA_ANTECIPACAO : 0;
  const valorLiquido = valorBruto - taxaAntecipacao;

  const tipoSaque = origem === "BONUS" ? "BONUS" : origem === "RENDIMENTO" ? "RENDIMENTO" : "CAPITAL";
  const config = await getConfiguracao();
  const automatico =
    tipoSaque === "CAPITAL"
      ? config.modoSaqueCapital === "AUTOMATICO"
      : config.modoSaqueRendimento === "AUTOMATICO";

  try {
    await prisma.$transaction(async (tx) => {
      const saque = await tx.solicitacaoSaque.create({
        data: {
          userId,
          tipo: tipoSaque,
          valor: valorLiquido,
          valorBruto,
          taxaAntecipacao: temTaxa ? taxaAntecipacao : null,
          emergencial: true,
          motivoEmergencia: motivo,
        },
      });

      if (origem === "CAPITAL") {
        await reservarCapitalParaSaqueEmergencial(tx, userId, valorBruto, saque.id);
      } else if (origem === "DISPONIVEL") {
        await reservarCapitalParaSaque(tx, userId, valorBruto, saque.id);
      } else {
        await reservarCreditosParaSaque(tx, userId, valorBruto, origem, saque.id);
      }

      if (automatico) {
        if (origem === "CAPITAL" || origem === "DISPONIVEL") {
          await tx.aplicacao.updateMany({
            where: { solicitacaoSaqueId: saque.id },
            data: { status: "RETIRADA" },
          });
        } else {
          await tx.creditoCarteira.updateMany({
            where: { solicitacaoSaqueId: saque.id },
            data: { utilizadoEm: new Date() },
          });
        }
        await tx.solicitacaoSaque.update({
          where: { id: saque.id },
          data: { status: "PAGO", processadoEm: new Date() },
        });
      }

      // Saque de emergência é liberado uma vez por pedido — o admin fecha de novo depois.
      await tx.user.update({ where: { id: userId }, data: { saqueEmergencialLiberado: false } });
    });
  } catch (e) {
    if (e instanceof SaldoInsuficienteError) {
      return { error: e.message };
    }
    throw e;
  }

  revalidatePath("/painel");

  const mensagemValor = temTaxa
    ? `Valor bruto: ${formatMoeda(valorBruto)} · Taxa de Antecipação (5%): -${formatMoeda(taxaAntecipacao)} · Você recebe: ${formatMoeda(valorLiquido)}.`
    : `Valor: ${formatMoeda(valorLiquido)}.`;

  return {
    sucesso: automatico
      ? `Saque de emergência processado. ${mensagemValor}`
      : `Saque de emergência solicitado. ${mensagemValor} Aguarde aprovação.`,
  };
}

export async function reaplicar(
  _prevState: AcaoState,
  formData: FormData
): Promise<AcaoState> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const valor = parseValor(formData.get("valor"));
  if (!valor || valor <= 0 || Number.isNaN(valor)) {
    return { error: "Informe um valor válido." };
  }
  if (valor < VALOR_MINIMO_REAPLICACAO) {
    return { error: `A reaplicação mínima é ${formatMoeda(VALOR_MINIMO_REAPLICACAO)}.` };
  }

  try {
    await prisma.$transaction((tx) => reaplicarSaldoDisponivel(tx, userId, valor));
  } catch (e) {
    if (e instanceof SaldoInsuficienteError) {
      return { error: e.message };
    }
    throw e;
  }

  revalidatePath("/painel");
  return { sucesso: `${formatMoeda(valor)} reaplicados. Novo lote com carência de 90 dias criado.` };
}
