"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatMoeda } from "@/lib/format";
import {
  calcularLiberacao,
  reservarCapitalParaSaque,
  reservarCreditosParaSaque,
  reaplicarSaldoDisponivel,
  SaldoInsuficienteError,
} from "@/lib/carteira";
import { getConfiguracao } from "@/lib/configuracao";
import { janelaSaqueRendimentoAberta, MENSAGEM_JANELA_FECHADA } from "@/lib/janela-saque";

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

  await prisma.aplicacao.create({
    data: {
      userId,
      valor,
      moeda: "BRL",
      status: "CONFIRMADA",
      liberaEm: calcularLiberacao(),
    },
  });

  revalidatePath("/painel");
  return {
    sucesso: `Aplicação de ${formatMoeda(valor)} confirmada. Carência de 90 dias iniciada.`,
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

  const config = await getConfiguracao();
  const automatico = config.modoSaqueCapital === "AUTOMATICO";

  try {
    await prisma.$transaction(async (tx) => {
      const saque = await tx.solicitacaoSaque.create({
        data: { userId, tipo: "CAPITAL", valor, moeda: "BRL" },
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

  const config = await getConfiguracao();
  const automatico = config.modoSaqueRendimento === "AUTOMATICO";

  try {
    await prisma.$transaction(async (tx) => {
      const saque = await tx.solicitacaoSaque.create({
        data: { userId, tipo: "RENDIMENTO", valor, moeda: "BRL" },
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
