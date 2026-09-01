"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { contratarServicos, desativarServico } from "@/lib/servicos-contratacao";
import type { CodigoServico, FormaContratacaoServico } from "@prisma/client";

export type ContratacaoState = { error?: string; sucesso?: string } | undefined;

function revalidarTudo() {
  revalidatePath("/painel/servicos");
  revalidatePath("/painel");
  revalidatePath("/painel/historico");
  revalidatePath("/restrito/historico");
}

export async function contratarServicoAction(
  _prevState: ContratacaoState,
  formData: FormData
): Promise<ContratacaoState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sessão expirada — faça login de novo." };

  const codigos = String(formData.get("codigos") ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean) as CodigoServico[];
  const forma = String(formData.get("forma") ?? "INDIVIDUAL") as FormaContratacaoServico;
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "").trim();

  if (!idempotencyKey) return { error: "Requisição inválida — recarregue a página e tente de novo." };

  const resultado = await contratarServicos(session.user.id, codigos, forma, idempotencyKey);
  if (resultado.error) return { error: resultado.error };

  revalidarTudo();
  return { sucesso: "Contratação confirmada! Os serviços já estão disponíveis." };
}

export async function desativarServicoAction(
  _prevState: ContratacaoState,
  formData: FormData
): Promise<ContratacaoState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Sessão expirada — faça login de novo." };

  const servicoId = String(formData.get("servicoId") ?? "").trim();
  if (!servicoId) return { error: "Serviço inválido." };

  const resultado = await desativarServico(session.user.id, servicoId);
  if (resultado.error) return { error: resultado.error };

  revalidarTudo();
  return { sucesso: "Serviço desativado." };
}
