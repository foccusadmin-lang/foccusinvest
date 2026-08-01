"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatMoeda } from "@/lib/format";
import { getConfiguracao } from "@/lib/configuracao";
import {
  reservarCapitalParaSaque,
  reservarCreditosParaSaque,
  SaldoInsuficienteError,
} from "@/lib/carteira";

export type AjusteSaldoState = { error?: string; sucesso?: string } | undefined;

const EPSILON = 0.005;
const ORIGEM_AJUSTE = "Ajuste manual (admin)";
const LABEL_TIPO: Record<string, string> = {
  CAPITAL: "Capital Principal",
  RENDIMENTO: "PLR / Rendimento disponível",
  BONUS: "Bônus de indicação",
};

function parseValor(raw: FormDataEntryValue | null): number {
  const texto = String(raw ?? "").trim().replace(/\./g, "").replace(",", ".");
  return Number(texto);
}

/** Reduz o capital "livre" (lotes CONFIRMADA, não reservados num saque em andamento),
 *  consumindo os lotes mais antigos primeiro e apagando os que zerarem. */
async function reduzirCapital(userId: string, valorReduzir: number): Promise<string | null> {
  const lotes = await prisma.aplicacao.findMany({
    where: { userId, status: "CONFIRMADA" },
    orderBy: { criadoEm: "asc" },
  });

  let restante = valorReduzir;
  for (const lote of lotes) {
    if (restante <= EPSILON) break;
    if (lote.valor <= restante + EPSILON) {
      await prisma.aplicacao.delete({ where: { id: lote.id } });
      restante -= lote.valor;
    } else {
      await prisma.aplicacao.update({ where: { id: lote.id }, data: { valor: lote.valor - restante } });
      restante = 0;
    }
  }

  if (restante > EPSILON) {
    return `Só é possível reduzir até o capital ainda livre (não reservado num saque em andamento). Faltou reduzir ${formatMoeda(restante)}.`;
  }
  return null;
}

async function ajustarCapital(userId: string, valor: number, operacao: string): Promise<string | null> {
  if (operacao === "ADICIONAR") {
    await prisma.aplicacao.create({
      data: {
        userId,
        valor,
        moeda: "BRL",
        origem: "AJUSTE_ADMIN",
        status: "CONFIRMADA",
        liberaEm: new Date(),
      },
    });
    return null;
  }

  const atual = await prisma.aplicacao.aggregate({
    where: { userId, status: { in: ["CONFIRMADA", "SAQUE_SOLICITADO"] } },
    _sum: { valor: true },
  });
  const valorAtual = atual._sum.valor ?? 0;
  const delta = valor - valorAtual;

  if (delta > EPSILON) {
    await prisma.aplicacao.create({
      data: {
        userId,
        valor: delta,
        moeda: "BRL",
        origem: "AJUSTE_ADMIN",
        status: "CONFIRMADA",
        liberaEm: new Date(),
      },
    });
  } else if (delta < -EPSILON) {
    return await reduzirCapital(userId, -delta);
  }
  return null;
}

/** Reduz o saldo "livre" (créditos ainda não usados nem reservados num saque), consumindo
 *  os mais antigos primeiro e apagando os que zerarem. */
async function reduzirCredito(
  userId: string,
  tipo: "RENDIMENTO" | "BONUS",
  valorReduzir: number
): Promise<string | null> {
  const linhas = await prisma.creditoCarteira.findMany({
    where: { userId, tipo, utilizadoEm: null, solicitacaoSaqueId: null },
    orderBy: { criadoEm: "asc" },
  });

  let restante = valorReduzir;
  for (const linha of linhas) {
    if (restante <= EPSILON) break;
    if (linha.valor <= restante + EPSILON) {
      await prisma.creditoCarteira.delete({ where: { id: linha.id } });
      restante -= linha.valor;
    } else {
      await prisma.creditoCarteira.update({ where: { id: linha.id }, data: { valor: linha.valor - restante } });
      restante = 0;
    }
  }

  if (restante > EPSILON) {
    return `Só é possível reduzir até o saldo ainda livre (não usado nem reservado num saque). Faltou reduzir ${formatMoeda(restante)}.`;
  }
  return null;
}

async function ajustarCredito(
  userId: string,
  tipo: "RENDIMENTO" | "BONUS",
  valor: number,
  operacao: string
): Promise<string | null> {
  if (operacao === "ADICIONAR") {
    await prisma.creditoCarteira.create({
      data: { userId, tipo, valor, moeda: "BRL", origem: ORIGEM_AJUSTE },
    });
    return null;
  }

  const atual = await prisma.creditoCarteira.aggregate({
    where: { userId, tipo, utilizadoEm: null, solicitacaoSaqueId: null },
    _sum: { valor: true },
  });
  const valorAtual = atual._sum.valor ?? 0;
  const delta = valor - valorAtual;

  if (delta > EPSILON) {
    await prisma.creditoCarteira.create({
      data: { userId, tipo, valor: delta, moeda: "BRL", origem: ORIGEM_AJUSTE },
    });
  } else if (delta < -EPSILON) {
    return await reduzirCredito(userId, tipo, -delta);
  }
  return null;
}

/** Saque feito pelo admin em nome do investidor — pra ajudar quem tem dificuldade de mexer no
 *  app sozinho. Usa o mesmo caminho de reserva/débito do saque normal (respeita a carência do
 *  Capital e o modo automático/manual configurado), só que quem pede é o admin. */
async function realizarSaqueAssistido(
  userId: string,
  tipo: "CAPITAL" | "RENDIMENTO" | "BONUS",
  valor: number,
  chavePix: string
): Promise<string | null> {
  const config = await getConfiguracao();
  const automatico =
    tipo === "CAPITAL" ? config.modoSaqueCapital === "AUTOMATICO" : config.modoSaqueRendimento === "AUTOMATICO";

  try {
    await prisma.$transaction(async (tx) => {
      const saque = await tx.solicitacaoSaque.create({
        data: { userId, tipo, valor, moeda: "BRL", motivoEmergencia: chavePix },
      });

      if (tipo === "CAPITAL") {
        await reservarCapitalParaSaque(tx, userId, valor, saque.id);
      } else {
        await reservarCreditosParaSaque(tx, userId, valor, tipo, saque.id);
      }

      if (automatico) {
        if (tipo === "CAPITAL") {
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
    });
  } catch (e) {
    if (e instanceof SaldoInsuficienteError) return e.message;
    throw e;
  }
  return null;
}

export async function ajustarSaldoUsuario(
  _prevState: AjusteSaldoState,
  formData: FormData
): Promise<AjusteSaldoState> {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") return { error: "Acesso negado." };

  const userId = String(formData.get("userId") ?? "");
  const operacao = String(formData.get("operacao") ?? "");
  const tipos = formData.getAll("tipos").map(String);

  if (!userId) return { error: "Usuário inválido." };
  if (operacao !== "ADICIONAR" && operacao !== "DEFINIR" && operacao !== "APAGAR" && operacao !== "SAQUE") {
    return { error: "Operação inválida." };
  }
  if (tipos.length === 0) {
    return { error: "Selecione ao menos um tipo de saldo para ajustar." };
  }

  const usuario = await prisma.user.findUnique({ where: { id: userId } });
  if (!usuario) return { error: "Usuário não encontrado." };

  if (operacao === "SAQUE") {
    const chavePix = String(formData.get("chavePix") ?? "").trim();
    if (!chavePix) return { error: "Informe a chave Pix pra onde o valor vai ser enviado." };

    const valoresSaque = new Map<string, number>();
    for (const tipo of tipos) {
      if (tipo !== "CAPITAL" && tipo !== "RENDIMENTO" && tipo !== "BONUS") {
        return { error: "Tipo de saldo inválido pra saque." };
      }
      const valor = parseValor(formData.get(`valor_${tipo}`));
      if (!valor || valor <= 0 || Number.isNaN(valor)) {
        return { error: `Informe um valor válido para ${LABEL_TIPO[tipo] ?? tipo}.` };
      }
      valoresSaque.set(tipo, valor);
    }

    for (const tipo of tipos) {
      const valor = valoresSaque.get(tipo)!;
      const erro = await realizarSaqueAssistido(
        userId,
        tipo as "CAPITAL" | "RENDIMENTO" | "BONUS",
        valor,
        chavePix
      );
      if (erro) return { error: erro };
    }

    const resumoSaque = tipos
      .map((tipo) => `${LABEL_TIPO[tipo] ?? tipo}: ${formatMoeda(valoresSaque.get(tipo)!)}`)
      .join(", ");

    await prisma.logAuditoria.create({
      data: {
        userId: session.user.id,
        acao: "saque_assistido_admin",
        detalhes: `${usuario.email} | Pix ${chavePix} | ${resumoSaque}`,
      },
    });

    revalidatePath("/restrito/usuarios");
    revalidatePath("/restrito/painel");
    revalidatePath("/restrito/saques");
    revalidatePath("/restrito/historico");
    revalidatePath("/painel");
    revalidatePath("/painel/historico");

    return {
      sucesso: `Saque assistido de ${resumoSaque} solicitado pra ${usuario.name ?? usuario.email}.`,
    };
  }

  if (operacao === "APAGAR") {
    for (const tipo of tipos) {
      let erro: string | null = null;
      if (tipo === "CAPITAL") erro = await ajustarCapital(userId, 0, "DEFINIR");
      else if (tipo === "RENDIMENTO") erro = await ajustarCredito(userId, "RENDIMENTO", 0, "DEFINIR");
      else if (tipo === "BONUS") erro = await ajustarCredito(userId, "BONUS", 0, "DEFINIR");

      if (erro) return { error: erro };
    }

    await prisma.logAuditoria.create({
      data: {
        userId: session.user.id,
        acao: "ajustar_saldo_usuario",
        detalhes: `${usuario.email} | APAGAR | ${tipos.map((t) => LABEL_TIPO[t] ?? t).join(", ")}`,
      },
    });

    revalidatePath("/restrito/usuarios");
    revalidatePath("/restrito/painel");

    return { sucesso: `Saldo zerado pra ${usuario.name ?? usuario.email}.` };
  }

  const valoresPorTipo = new Map<string, number>();
  for (const tipo of tipos) {
    const valor = parseValor(formData.get(`valor_${tipo}`));
    if (!valor || valor <= 0 || Number.isNaN(valor)) {
      return { error: `Informe um valor válido para ${LABEL_TIPO[tipo] ?? tipo}.` };
    }
    valoresPorTipo.set(tipo, valor);
  }

  for (const tipo of tipos) {
    const valor = valoresPorTipo.get(tipo)!;
    let erro: string | null = null;
    if (tipo === "CAPITAL") erro = await ajustarCapital(userId, valor, operacao);
    else if (tipo === "RENDIMENTO") erro = await ajustarCredito(userId, "RENDIMENTO", valor, operacao);
    else if (tipo === "BONUS") erro = await ajustarCredito(userId, "BONUS", valor, operacao);

    if (erro) return { error: erro };
  }

  const resumo = tipos
    .map((tipo) => `${LABEL_TIPO[tipo] ?? tipo}: ${formatMoeda(valoresPorTipo.get(tipo)!)}`)
    .join(", ");

  await prisma.logAuditoria.create({
    data: {
      userId: session.user.id,
      acao: "ajustar_saldo_usuario",
      detalhes: `${usuario.email} | ${operacao} | ${resumo}`,
    },
  });

  revalidatePath("/restrito/usuarios");
  revalidatePath("/restrito/painel");

  return { sucesso: `Saldo de ${usuario.name ?? usuario.email} atualizado.` };
}

export async function alternarSaqueEmergencial(userId: string, liberado: boolean) {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") throw new Error("Acesso negado.");

  const usuario = await prisma.user.update({
    where: { id: userId },
    data: { saqueEmergencialLiberado: liberado },
  });

  await prisma.logAuditoria.create({
    data: {
      userId: session.user.id,
      acao: liberado ? "liberar_saque_emergencial" : "bloquear_saque_emergencial",
      detalhes: usuario.email,
    },
  });

  revalidatePath("/restrito/usuarios");
}
