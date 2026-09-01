"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { salvarBenchmark, excluirBenchmark } from "@/lib/indices-mercado";
import type { IndicadorMercado } from "@prisma/client";

export type BenchmarkState = { error?: string; sucesso?: string } | undefined;

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") throw new Error("Acesso negado.");
  return session.user;
}

function parsePercentual(raw: FormDataEntryValue | null): number {
  const texto = String(raw ?? "").trim().replace(",", ".");
  return Number(texto);
}

export async function salvarBenchmarkAction(
  _prevState: BenchmarkState,
  formData: FormData
): Promise<BenchmarkState> {
  const admin = await requireAdmin();

  const indicador = String(formData.get("indicador") ?? "") as IndicadorMercado;
  const mes = String(formData.get("mes") ?? "").trim();
  const valorPercentual = parsePercentual(formData.get("valorPercentual"));

  const resultado = await salvarBenchmark({ indicador, mes, valorPercentual, criadoPorId: admin.id });
  if (resultado.error) return { error: resultado.error };

  revalidatePath("/restrito/indices");
  revalidatePath("/painel");
  return { sucesso: "Índice lançado." };
}

export async function excluirBenchmarkAction(id: string): Promise<void> {
  await requireAdmin();
  await excluirBenchmark(id);
  revalidatePath("/restrito/indices");
  revalidatePath("/painel");
}
