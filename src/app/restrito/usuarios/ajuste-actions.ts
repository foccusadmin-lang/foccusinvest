"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatMoeda } from "@/lib/format";
import { getConfiguracao } from "@/lib/configuracao";
import {
  reservarCapitalParaSaqueAdmin,
  reservarCreditosParaSaque,
  SaldoInsuficienteError,
} from "@/lib/carteira";
import {
  adicionarIncentivoLideranca,
  definirIncentivoLideranca,
  zerarIncentivoLideranca,
  reservarIncentivoLiderancaParaSaque,
} from "@/lib/incentivo-lideranca";

export type AjusteSaldoState = { error?: string; sucesso?: string } | undefined;

const EPSILON = 0.005;
const ORIGEM_AJUSTE = "Ajuste manual (admin)";
const LABEL_TIPO: Record<string, string> = {
  CAPITAL: "Capital Principal",
  RENDIMENTO: "PLR / Rendimento disponível",
  BONUS: "Bônus de indicação",
  INCENTIVO_LIDERANCA: "Incentivo de liderança",
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
    omit: { comprovante: true },
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
 *  app sozinho. Ignora a carência do Capital (libera o valor antes do prazo por decisão do
 *  admin) e não tem restrição de dia/horário — pode ser feito a qualquer momento. Só respeita o
 *  modo automático/manual configurado pra saques. */
async function realizarSaqueAssistido(
  userId: string,
  tipo: "CAPITAL" | "RENDIMENTO" | "BONUS" | "INCENTIVO_LIDERANCA",
  valor: number,
  chavePix: string
): Promise<string | null> {
  const config = await getConfiguracao();
  const automatico =
    tipo === "CAPITAL" ? config.modoSaqueCapital === "AUTOMATICO" : config.modoSaqueRendimento === "AUTOMATICO";

  // Incentivo de liderança some da carteira do investidor exatamente como um saque de
  // rendimento — só a origem do crédito consumido é diferente (ver reservarIncentivoLideranca-
  // ParaSaque). O registro em SolicitacaoSaque usa tipo RENDIMENTO porque não existe um tipo de
  // saque próprio pra isso — a distinção fica no crédito de origem, não no saque em si.
  const tipoSaque = tipo === "INCENTIVO_LIDERANCA" ? "RENDIMENTO" : tipo;

  try {
    await prisma.$transaction(async (tx) => {
      const saque = await tx.solicitacaoSaque.create({
        data: { userId, tipo: tipoSaque, valor, moeda: "BRL", motivoEmergencia: chavePix },
      });

      if (tipo === "CAPITAL") {
        await reservarCapitalParaSaqueAdmin(tx, userId, valor, saque.id);
      } else if (tipo === "INCENTIVO_LIDERANCA") {
        await reservarIncentivoLiderancaParaSaque(tx, userId, valor, saque.id);
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

  if (tipos.includes("INCENTIVO_LIDERANCA") && usuario.perfil !== "LIDER") {
    return { error: "Incentivo de liderança só pode ser ajustado pra quem é líder." };
  }

  if (operacao === "SAQUE") {
    const chavePix = String(formData.get("chavePix") ?? "").trim();
    if (!chavePix) return { error: "Informe a chave Pix pra onde o valor vai ser enviado." };

    const valoresSaque = new Map<string, number>();
    for (const tipo of tipos) {
      if (tipo !== "CAPITAL" && tipo !== "RENDIMENTO" && tipo !== "BONUS" && tipo !== "INCENTIVO_LIDERANCA") {
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
        tipo as "CAPITAL" | "RENDIMENTO" | "BONUS" | "INCENTIVO_LIDERANCA",
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
      else if (tipo === "INCENTIVO_LIDERANCA") erro = await zerarIncentivoLideranca(userId);

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
    else if (tipo === "INCENTIVO_LIDERANCA") {
      if (operacao === "ADICIONAR") await adicionarIncentivoLideranca(userId, valor);
      else erro = await definirIncentivoLideranca(userId, valor);
    }

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
