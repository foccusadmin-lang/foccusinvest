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
