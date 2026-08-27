"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MARKETPLACE_CITY, MARKETPLACE_STATE } from "./config";

/**
 * "Não encontrou seu bairro?" (spec "Parte 2", seção 11/12) — NUNCA cria a região oficial na
 * hora; só registra a sugestão pro admin revisar depois em /marketplace/admin/regioes. Usada
 * tanto pelo cliente quanto pelo prestador, a partir de qualquer tela com <SugerirBairroForm>.
 */
export async function sugerirBairroAction(formData: FormData) {
  const session = await auth();
  const voltarPara = String(formData.get("voltarPara") || "/marketplace");
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(voltarPara)}`);
  }

  const nome = String(formData.get("nome") || "").trim();
  if (nome) {
    await prisma.sugestaoRegiao.create({
      data: {
        nome,
        cidade: MARKETPLACE_CITY,
        estado: MARKETPLACE_STATE,
        enviadoPorId: session.user.id,
      },
    });
  }

  const separador = voltarPara.includes("?") ? "&" : "?";
  redirect(`${voltarPara}${separador}sugestaoEnviada=1`);
}
