"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatMoeda } from "@/lib/format";

export type PlrIndividualState = { error?: string; sucesso?: string } | undefined;

function parsePercentual(raw: FormDataEntryValue | null): number {
  const texto = String(raw ?? "").trim().replace(",", ".");
  return Number(texto);
}

function hojeBrasiliaStr(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

/** Meio-dia de Brasília pro dia escolhido, pra nunca virar o dia errado ao exibir
 *  (formatData já usa o fuso de Brasília, mas isso evita qualquer risco de rollover). */
function parseDataLancamento(raw: FormDataEntryValue | null): Date | null {
  const texto = String(raw ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return null;
  const data = new Date(`${texto}T12:00:00-03:00`);
  return Number.isNaN(data.getTime()) ? null : data;
}

export async function aplicarPlrIndividual(
  _prevState: PlrIndividualState,
  formData: FormData
): Promise<PlrIndividualState> {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") return { error: "Acesso negado." };

  const percentual = parsePercentual(formData.get("percentual"));
  const userIds = formData.getAll("userIds").map(String);
  const observacao = String(formData.get("observacao") ?? "").trim();
  const dataTexto = String(formData.get("data") ?? "").trim();
  const criadoEm = parseDataLancamento(formData.get("data"));

  if (!percentual || percentual <= 0 || Number.isNaN(percentual) || percentual > 100) {
    return { error: "Informe um percentual válido (ex: 0,5 para 0,5%)." };
  }
  if (userIds.length === 0) {
    return { error: "Selecione ao menos um usuário." };
  }
  if (!criadoEm) {
    return { error: "Informe uma data válida para o lançamento." };
  }
  if (dataTexto > hojeBrasiliaStr()) {
    return { error: "A data do lançamento não pode ser no futuro." };
  }

  const capitaisPorUsuario = await prisma.aplicacao.groupBy({
    by: ["userId"],
    where: { userId: { in: userIds }, status: { in: ["CONFIRMADA", "SAQUE_SOLICITADO"] } },
    _sum: { valor: true },
  });
  const capitalPorId = new Map(capitaisPorUsuario.map((c) => [c.userId, c._sum.valor ?? 0]));

  const origem = observacao
    ? `PLR manual ${percentual}% (admin) — ${observacao}`
    : `PLR manual ${percentual}% (admin)`;

  const creditos = userIds
    .map((userId) => {
      const capital = capitalPorId.get(userId) ?? 0;
      const valor = capital * (percentual / 100);
      return { userId, valor };
    })
    .filter((c) => c.valor > 0);

  const totalCreditado = creditos.reduce((acc, c) => acc + c.valor, 0);
  const usuariosCreditados = creditos.length;

  if (usuariosCreditados > 0) {
    // createMany faz um único insert em lote — evita N idas ao banco (uma por usuário),
    // que já estourou o limite de 5s de transação com muitos investidores selecionados.
    await prisma.creditoCarteira.createMany({
      data: creditos.map((c) => ({
        userId: c.userId,
        tipo: "RENDIMENTO",
        valor: c.valor,
        moeda: "BRL",
        origem,
        criadoEm,
      })),
    });
  }

  await prisma.logAuditoria.create({
    data: {
      userId: session.user.id,
      acao: "aplicar_plr_individual",
      detalhes: `${percentual}% para ${usuariosCreditados} usuário(s) em ${dataTexto}, total ${formatMoeda(totalCreditado)}${observacao ? ` | ${observacao}` : ""}`,
    },
  });

  revalidatePath("/restrito/plr-individual");
  revalidatePath("/restrito/usuarios");
  revalidatePath("/restrito/painel");

  if (usuariosCreditados === 0) {
    return { error: "Nenhum dos usuários selecionados tem capital elegível (maior que zero)." };
  }

  return {
    sucesso: `PLR de ${percentual}% aplicado para ${usuariosCreditados} investidor(es). Total creditado: ${formatMoeda(totalCreditado)}.`,
  };
}

export async function excluirCreditoPlrIndividual(creditoId: string) {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") throw new Error("Acesso negado.");

  const credito = await prisma.creditoCarteira.findUnique({ where: { id: creditoId } });
  if (!credito) throw new Error("Lançamento não encontrado.");
  if (credito.utilizadoEm || credito.solicitacaoSaqueId) {
    throw new Error("Esse valor já foi usado ou está reservado num saque — não é possível apagar.");
  }

  await prisma.creditoCarteira.delete({ where: { id: creditoId } });

  await prisma.logAuditoria.create({
    data: {
      userId: session.user.id,
      acao: "excluir_credito_plr_individual",
      detalhes: `${creditoId} | ${credito.userId} | ${formatMoeda(credito.valor)}`,
    },
  });

  revalidatePath("/restrito/plr-individual");
  revalidatePath("/restrito/usuarios");
  revalidatePath("/restrito/painel");
}
