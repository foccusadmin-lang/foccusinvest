"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  criarCampanhaPlrAutomatica,
  cancelarCampanhaPlrAutomatica,
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

/** Cancela a campanha — remove ela por completo se nenhum dia ainda virou Distribuição real, ou
 *  desativa e remove só os dias pendentes se parte dela já rodou (preserva o que já é histórico
 *  financeiro de verdade). */
export async function cancelarCampanhaAction(id: string): Promise<{ error?: string; mensagem?: string }> {
  const admin = await requireAdmin();
  const resultado = await cancelarCampanhaPlrAutomatica(id);
  if (resultado.error) return { error: resultado.error };

  await prisma.logAuditoria.create({
    data: {
      userId: admin.id,
      acao: "cancelar_campanha_plr_automatica",
      detalhes: resultado.removidaPorCompleto
        ? `Campanha ${id} removida por completo (nenhum dia processado ainda)`
        : `Campanha ${id} cancelada — ${resultado.diasPendentesRemovidos} dia(s) pendente(s) removido(s), dias já processados preservados`,
    },
  });

  revalidatePath("/restrito/plr-automatico");
  return {
    mensagem: resultado.removidaPorCompleto
      ? "Campanha removida — nada tinha sido lançado ainda."
      : `Campanha cancelada — ${resultado.diasPendentesRemovidos} dia(s) pendente(s) removido(s). Os dias já lançados continuam no histórico.`,
  };
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
