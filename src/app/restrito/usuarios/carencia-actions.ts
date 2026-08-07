"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatMoeda, formatData } from "@/lib/format";

export type CarenciaState = { error?: string; sucesso?: string } | undefined;

const EPSILON = 0.005;

function parseValor(raw: FormDataEntryValue | null): number {
  const texto = String(raw ?? "").trim().replace(/\./g, "").replace(",", ".");
  return Number(texto);
}

/** Redistribui o capital "livre" (lotes CONFIRMADA, não reservados num saque em andamento)
 *  entre uma parte disponível na hora e uma ou mais faixas em carência, cada uma com a própria
 *  data de liberação — útil quando o investidor aportou em datas diferentes e cada parte tem um
 *  prazo próprio de carência. O total de capital não muda, só como ele está dividido. */
export async function ajustarCarenciaUsuario(
  _prevState: CarenciaState,
  formData: FormData
): Promise<CarenciaState> {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") return { error: "Acesso negado." };

  const userId = String(formData.get("userId") ?? "");
  const valorDisponivel = parseValor(formData.get("valorDisponivel"));
  const quantidadeFaixas = Number(formData.get("quantidadeFaixas") ?? "0");

  if (!userId) return { error: "Usuário inválido." };
  if (Number.isNaN(valorDisponivel) || valorDisponivel < 0) {
    return { error: "Informe um valor disponível válido." };
  }

  const usuario = await prisma.user.findUnique({ where: { id: userId } });
  if (!usuario) return { error: "Usuário não encontrado." };

  const lotes = await prisma.aplicacao.findMany({
    where: { userId, status: "CONFIRMADA" },
    orderBy: { criadoEm: "asc" },
  });
  const totalLivre = lotes.reduce((acc, l) => acc + l.valor, 0);

  if (totalLivre <= EPSILON) {
    return { error: "Esse investidor não tem capital livre pra ajustar (tudo já está reservado num saque ou é zero)." };
  }
  if (valorDisponivel > totalLivre + EPSILON) {
    return {
      error: `O valor disponível não pode passar do capital livre atual (${formatMoeda(totalLivre)}).`,
    };
  }

  const faixas: { valor: number; data: Date }[] = [];
  for (let i = 0; i < quantidadeFaixas; i++) {
    const valor = parseValor(formData.get(`carenciaValor_${i}`));
    const dataTexto = String(formData.get(`carenciaData_${i}`) ?? "");
    if (!valor || Number.isNaN(valor) || valor <= EPSILON) continue;

    if (!dataTexto) return { error: `Informe a data de liberação da faixa em carência nº ${i + 1}.` };
    const data = new Date(`${dataTexto}T00:00:00`);
    if (Number.isNaN(data.getTime())) return { error: `Data inválida na faixa em carência nº ${i + 1}.` };

    faixas.push({ valor, data });
  }

  const totalCarencia = faixas.reduce((acc, f) => acc + f.valor, 0);
  const somaTotal = valorDisponivel + totalCarencia;

  if (somaTotal > totalLivre + EPSILON) {
    return {
      error: `A soma do valor disponível com as faixas em carência (${formatMoeda(somaTotal)}) passa do capital livre atual (${formatMoeda(totalLivre)}).`,
    };
  }

  // A diferença que sobrar (se o admin não preencheu faixas suficientes pra cobrir todo o
  // capital livre) fica numa última faixa "sem data específica" — reaproveita a data mais
  // distante informada, ou hoje mesmo se nenhuma faixa foi criada.
  const restanteSemFaixa = Math.max(0, totalLivre - somaTotal);
  if (restanteSemFaixa > EPSILON) {
    const dataFallback = faixas.length > 0 ? faixas[faixas.length - 1].data : new Date();
    faixas.push({ valor: restanteSemFaixa, data: dataFallback });
  }

  await prisma.$transaction(async (tx) => {
    await tx.aplicacao.deleteMany({ where: { id: { in: lotes.map((l) => l.id) } } });

    if (valorDisponivel > EPSILON) {
      await tx.aplicacao.create({
        data: {
          userId,
          valor: valorDisponivel,
          moeda: "BRL",
          origem: "AJUSTE_ADMIN",
          status: "CONFIRMADA",
          liberaEm: new Date(),
        },
      });
    }
    for (const faixa of faixas) {
      await tx.aplicacao.create({
        data: {
          userId,
          valor: faixa.valor,
          moeda: "BRL",
          origem: "AJUSTE_ADMIN",
          status: "CONFIRMADA",
          liberaEm: faixa.data,
        },
      });
    }
  });

  const resumoCarencia = faixas.map((f) => `${formatMoeda(f.valor)} até ${formatData(f.data)}`).join("; ");

  await prisma.logAuditoria.create({
    data: {
      userId: session.user.id,
      acao: "ajustar_carencia_usuario",
      detalhes: `${usuario.email} | disponível: ${formatMoeda(valorDisponivel)} | carência: ${resumoCarencia || "—"}`,
    },
  });

  revalidatePath("/restrito/usuarios");
  revalidatePath("/restrito/painel");
  revalidatePath("/painel");

  return {
    sucesso: `Capital de ${usuario.name ?? usuario.email} ajustado: ${formatMoeda(valorDisponivel)} disponível${
      faixas.length > 0 ? `, em carência: ${resumoCarencia}` : ""
    }.`,
  };
}
