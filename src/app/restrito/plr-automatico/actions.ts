"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  criarCampanhaPlrAutomatica,
  desativarCampanhaPlrAutomatica,
  recalcularCronogramaRestante,
} from "@/lib/plr-automatico";

export type CampanhaState = { error?: string; sucesso?: string } | undefined;

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") throw new Error("Acesso negado.");
  return session.user;
}

function parsePercentual(raw: FormDataEntryValue | null): number {
  const texto = String(raw ?? "").trim().replace(",", ".");
  return Number(texto);
}

export async function criarCampanhaAction(
  _prevState: CampanhaState,
  formData: FormData
): Promise<CampanhaState> {
  const admin = await requireAdmin();

  const percentualTotal = parsePercentual(formData.get("percentualTotal"));
  const periodoInicioStr = String(formData.get("periodoInicio") ?? "");
  const periodoFimStr = String(formData.get("periodoFim") ?? "");
  const horarioLancamento = String(formData.get("horarioLancamento") ?? "").trim();

  if (!periodoInicioStr || !periodoFimStr) return { error: "Informe a data início e a data fim." };

  const periodoInicio = new Date(periodoInicioStr);
  const periodoFim = new Date(periodoFimStr);

  const resultado = await criarCampanhaPlrAutomatica({
    percentualTotal,
    periodoInicio,
    periodoFim,
    horarioLancamento,
    criadoPorId: admin.id,
  });
  if (resultado.error) return { error: resultado.error };

  await prisma.logAuditoria.create({
    data: {
      userId: admin.id,
      acao: "criar_campanha_plr_automatica",
      detalhes: `${percentualTotal}% de ${periodoInicioStr} a ${periodoFimStr}, às ${horarioLancamento}`,
    },
  });

  revalidatePath("/restrito/plr-automatico");
  revalidatePath("/restrito/configuracoes");
  return { sucesso: "Campanha criada — o cronograma diário já foi sorteado." };
}

export async function desativarCampanhaAction(id: string): Promise<void> {
  const admin = await requireAdmin();
  await desativarCampanhaPlrAutomatica(id);
  await prisma.logAuditoria.create({
    data: { userId: admin.id, acao: "desativar_campanha_plr_automatica", detalhes: id },
  });
  revalidatePath("/restrito/plr-automatico");
}

/** Regera o cronograma dos dias ainda não processados de uma campanha (ex: depois de uma
 *  correção nas regras de sorteio) — nunca toca nos dias já materializados. */
export async function recalcularCronogramaAction(id: string): Promise<{ error?: string }> {
  const admin = await requireAdmin();
  const resultado = await recalcularCronogramaRestante(id);
  if (resultado.error) return { error: resultado.error };

  await prisma.logAuditoria.create({
    data: {
      userId: admin.id,
      acao: "recalcular_cronograma_plr_automatica",
      detalhes: `Campanha ${id} — ${resultado.diasRegerados} dia(s) regerado(s)`,
    },
  });

  revalidatePath("/restrito/plr-automatico");
  return {};
}
