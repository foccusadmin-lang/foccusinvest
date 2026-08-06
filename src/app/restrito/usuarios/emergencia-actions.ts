"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { criarLiberacaoEmergencial, cancelarLiberacaoEmergencial } from "@/lib/emergencia";
import type { TipoLiberacaoEmergencial } from "@prisma/client";

export type LiberacaoEmergenciaState = { error?: string; sucesso?: string } | undefined;

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") throw new Error("Acesso negado.");
  return session.user;
}

async function ipDoPedido(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

function parseValor(raw: FormDataEntryValue | null): number {
  const texto = String(raw ?? "").trim().replace(/\./g, "").replace(",", ".");
  return Number(texto);
}

export async function liberarEmergenciaAction(
  _prevState: LiberacaoEmergenciaState,
  formData: FormData
): Promise<LiberacaoEmergenciaState> {
  const admin = await requireAdmin();

  const aplicacaoId = String(formData.get("aplicacaoId") ?? "");
  const tipoSaque = String(formData.get("tipoSaque") ?? "") as TipoLiberacaoEmergencial;
  const valorMaximo = parseValor(formData.get("valorMaximo"));
  const prazoTexto = String(formData.get("prazoValidade") ?? "");
  const motivo = String(formData.get("motivo") ?? "");

  if (!aplicacaoId) return { error: "Selecione a aplicação a ser liberada." };
  if (tipoSaque !== "TOTAL" && tipoSaque !== "PARCIAL") {
    return { error: "Selecione o tipo de saque: total ou parcial." };
  }
  if (!prazoTexto) return { error: "Informe o prazo de validade da autorização." };

  // Expira no fim do dia escolhido, no horário de Brasília.
  const expiraEm = new Date(`${prazoTexto}T23:59:59-03:00`);

  const resultado = await criarLiberacaoEmergencial({
    aplicacaoId,
    adminId: admin.id,
    valorMaximo,
    tipoSaque,
    expiraEm,
    motivo,
    ip: await ipDoPedido(),
  });

  if (resultado.error) return { error: resultado.error };

  revalidatePath("/restrito/usuarios");
  revalidatePath("/painel");

  return { sucesso: "Emergência liberada." };
}

export async function cancelarLiberacaoEmergenciaAction(liberacaoId: string) {
  const admin = await requireAdmin();
  const resultado = await cancelarLiberacaoEmergencial(liberacaoId, admin.id, await ipDoPedido());
  if (resultado.error) throw new Error(resultado.error);

  revalidatePath("/restrito/usuarios");
  revalidatePath("/painel");
}
