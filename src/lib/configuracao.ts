import { prisma } from "@/lib/prisma";
import type { ModoProcessamento } from "@prisma/client";

export async function getConfiguracao() {
  return prisma.configuracaoSistema.upsert({
    where: { id: "default" },
    create: { id: "default" },
    update: {},
  });
}

export async function atualizarModoSaque(
  campo:
    | "modoSaqueCapital"
    | "modoSaqueRendimento"
    | "modoVerificacaoCadastro"
    | "modoIncentivoLideranca"
    | "modoBonusIndicacao"
    | "modoAprovacaoAporte"
    | "modoPLR",
  modo: ModoProcessamento
) {
  await prisma.configuracaoSistema.upsert({
    where: { id: "default" },
    create: { id: "default", [campo]: modo },
    update: { [campo]: modo },
  });
}
