"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import type { ModoProcessamento } from "@prisma/client";
import { atualizarModoSaque } from "@/lib/configuracao";
import { prisma } from "@/lib/prisma";

export async function definirModoSaque(
  campo:
    | "modoSaqueCapital"
    | "modoSaqueRendimento"
    | "modoVerificacaoCadastro"
    | "modoIncentivoLideranca"
    | "modoBonusIndicacao"
    | "modoAprovacaoAporte",
  modo: ModoProcessamento
) {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") throw new Error("Acesso negado.");

  await atualizarModoSaque(campo, modo);
  await prisma.logAuditoria.create({
    data: { userId: session.user.id, acao: "definir_modo_saque", detalhes: `${campo}=${modo}` },
  });

  revalidatePath("/restrito/painel");
}

export type LimiteAporteState = { error?: string; sucesso?: string } | undefined;

/** Teto de valor pra um aporte via Pix se qualificar pra aprovação automática — acima disso,
 *  mesmo com o modo Automático ligado, cai pra conferência manual (ver criarAplicacao, em
 *  painel/actions.ts). */
export async function definirValorMaximoAprovacaoAutomatica(
  _prevState: LimiteAporteState,
  formData: FormData
): Promise<LimiteAporteState> {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") return { error: "Acesso negado." };

  const texto = String(formData.get("valorMaximo") ?? "").trim().replace(/\./g, "").replace(",", ".");
  const valor = Number(texto);
  if (!valor || valor <= 0 || Number.isNaN(valor)) {
    return { error: "Informe um valor válido." };
  }

  await prisma.configuracaoSistema.upsert({
    where: { id: "default" },
    create: { id: "default", valorMaximoAprovacaoAutomatica: valor },
    update: { valorMaximoAprovacaoAutomatica: valor },
  });

  await prisma.logAuditoria.create({
    data: {
      userId: session.user.id,
      acao: "definir_valor_maximo_aprovacao_automatica",
      detalhes: String(valor),
    },
  });

  revalidatePath("/restrito/painel");
  revalidatePath("/restrito/configuracoes");
  return { sucesso: "Limite atualizado." };
}
