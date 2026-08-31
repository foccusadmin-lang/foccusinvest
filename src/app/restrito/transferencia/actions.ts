"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { transferirCapitalEntreUsuarios, SaldoInsuficienteError } from "@/lib/carteira";
import { formatMoeda } from "@/lib/format";

export type TransferenciaState = { error?: string; sucesso?: string } | undefined;

function parseValor(raw: FormDataEntryValue | null): number {
  const texto = String(raw ?? "").trim().replace(/\./g, "").replace(",", ".");
  return Number(texto);
}

export async function transferirSaldoCapital(
  _prevState: TransferenciaState,
  formData: FormData
): Promise<TransferenciaState> {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") return { error: "Acesso negado." };

  const origemUserId = String(formData.get("origemUserId") ?? "").trim();
  const destinoUserId = String(formData.get("destinoUserId") ?? "").trim();
  const valor = parseValor(formData.get("valor"));

  if (!origemUserId || !destinoUserId) {
    return { error: "Selecione o investidor de origem e o de destino." };
  }
  if (origemUserId === destinoUserId) {
    return { error: "A origem e o destino não podem ser o mesmo investidor." };
  }
  if (!valor || valor <= 0 || Number.isNaN(valor)) {
    return { error: "Informe um valor válido." };
  }

  const [origem, destino] = await Promise.all([
    prisma.user.findUnique({ where: { id: origemUserId }, select: { email: true, statusCadastro: true } }),
    prisma.user.findUnique({ where: { id: destinoUserId }, select: { email: true, statusCadastro: true } }),
  ]);
  if (!origem || origem.statusCadastro !== "APROVADO") {
    return { error: "Investidor de origem inválido ou não está mais ativo." };
  }
  if (!destino || destino.statusCadastro !== "APROVADO") {
    return { error: "Investidor de destino inválido ou não está mais ativo." };
  }

  try {
    await prisma.$transaction((tx) => transferirCapitalEntreUsuarios(tx, origemUserId, destinoUserId, valor));
  } catch (e) {
    if (e instanceof SaldoInsuficienteError) return { error: e.message };
    if (e instanceof Error) return { error: e.message };
    throw e;
  }

  await prisma.logAuditoria.create({
    data: {
      userId: session.user.id,
      acao: "transferir_capital_entre_usuarios",
      detalhes: `De ${origem.email} para ${destino.email} | R$ ${valor.toFixed(2)}`,
    },
  });

  revalidatePath("/restrito/transferencia");
  revalidatePath("/restrito/usuarios");
  revalidatePath("/restrito/painel");
  revalidatePath("/restrito/historico");
  revalidatePath("/painel");
  revalidatePath("/painel/historico");

  return {
    sucesso: `${formatMoeda(valor)} transferido de ${origem.email} para ${destino.email}.`,
  };
}
