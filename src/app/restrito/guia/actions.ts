"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TOPICOS_GUIA } from "@/lib/guia-conhecimento";

export type FaqState = { error?: string; sucesso?: string } | undefined;

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") throw new Error("Acesso negado.");
  return session.user;
}

export async function criarFaqAction(_prevState: FaqState, formData: FormData): Promise<FaqState> {
  const admin = await requireAdmin();

  const topico = String(formData.get("topico") ?? "").trim();
  const pergunta = String(formData.get("pergunta") ?? "").trim();
  const resposta = String(formData.get("resposta") ?? "").trim();

  if (!TOPICOS_GUIA.includes(topico as (typeof TOPICOS_GUIA)[number])) {
    return { error: "Selecione um tópico válido." };
  }
  if (!pergunta || !resposta) {
    return { error: "Preencha a pergunta e a resposta." };
  }

  await prisma.faqGuia.create({
    data: { topico, pergunta, resposta, criadoPorId: admin.id },
  });

  revalidatePath("/restrito/guia");
  return { sucesso: "FAQ adicionada. Já vale pras próximas respostas do Guia Foccus." };
}

export async function excluirFaqAction(id: string): Promise<void> {
  await requireAdmin();
  await prisma.faqGuia.delete({ where: { id } });
  revalidatePath("/restrito/guia");
}
