"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MARKETPLACE_CITY, MARKETPLACE_STATE } from "@/lib/marketplace/config";
import { slugificarRegiao, regiaoDuplicada } from "@/lib/marketplace/regioes";

async function exigirAdmin() {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") redirect("/marketplace/admin");
  return session;
}

function comMensagem(caminho: string, mensagem: string): string {
  const separador = caminho.includes("?") ? "&" : "?";
  return `${caminho}${separador}msg=${encodeURIComponent(mensagem)}`;
}

/** + Novo bairro (spec "Parte 2", seção 14) — bloqueia nome duplicado (mesmo slug) na cidade. */
export async function criarRegiao(formData: FormData) {
  await exigirAdmin();

  const nome = String(formData.get("nome") || "").trim();
  const ativo = formData.get("ativo") === "on";
  if (!nome) redirect(comMensagem("/marketplace/admin/regioes", "Informe o nome do bairro."));

  const slug = slugificarRegiao(nome);
  if (await regiaoDuplicada(MARKETPLACE_CITY, slug)) {
    redirect(comMensagem("/marketplace/admin/regioes", `Já existe um bairro chamado "${nome}".`));
  }

  await prisma.regiao.create({
    data: { nome, slug, cidade: MARKETPLACE_CITY, estado: MARKETPLACE_STATE, ativo },
  });

  redirect(comMensagem("/marketplace/admin/regioes", `Bairro "${nome}" criado.`));
}

/** Editar bairro (seção 15) — nome, estado e status. Recalcula o slug se o nome mudou, checando
 *  duplicidade de novo (sem contar a própria região). */
export async function atualizarRegiao(id: string, formData: FormData) {
  await exigirAdmin();

  const nome = String(formData.get("nome") || "").trim();
  const estado = String(formData.get("estado") || "").trim() || MARKETPLACE_STATE;
  const ativo = formData.get("ativo") === "on";
  if (!nome) redirect(comMensagem(`/marketplace/admin/regioes/${id}/editar`, "Informe o nome do bairro."));

  const slug = slugificarRegiao(nome);
  if (await regiaoDuplicada(MARKETPLACE_CITY, slug, id)) {
    redirect(
      comMensagem(`/marketplace/admin/regioes/${id}/editar`, `Já existe um bairro chamado "${nome}".`)
    );
  }

  await prisma.regiao.update({
    where: { id },
    data: { nome, slug, estado, ativo },
  });

  redirect(comMensagem("/marketplace/admin/regioes", `Bairro "${nome}" atualizado.`));
}

/** Desativar/reativar (seção 16) — nunca exclui: cadastros antigos que já referenciam essa
 *  região continuam válidos, só para de aparecer pra novos cadastros/buscas. */
export async function alternarAtivoRegiao(formData: FormData) {
  await exigirAdmin();
  const id = String(formData.get("id") || "");
  const regiao = await prisma.regiao.findUnique({ where: { id } });
  if (!regiao) redirect("/marketplace/admin/regioes");

  await prisma.regiao.update({ where: { id }, data: { ativo: !regiao.ativo } });
  redirect(
    comMensagem(
      "/marketplace/admin/regioes",
      `Bairro "${regiao.nome}" ${regiao.ativo ? "desativado" : "reativado"}.`
    )
  );
}

/** Aprova uma sugestão de bairro enviada por cliente/prestador — cria a Regiao de verdade (ou
 *  reaproveita uma já existente com o mesmo slug, se alguém já tiver cadastrado nesse meio
 *  tempo) e marca a sugestão como APROVADA. */
export async function aprovarSugestao(formData: FormData) {
  const session = await exigirAdmin();
  const id = String(formData.get("id") || "");
  const sugestao = await prisma.sugestaoRegiao.findUnique({ where: { id } });
  if (!sugestao || sugestao.status !== "PENDENTE") redirect("/marketplace/admin/regioes");

  const slug = slugificarRegiao(sugestao.nome);
  await prisma.regiao.upsert({
    where: { cidade_slug: { cidade: sugestao.cidade, slug } },
    update: {},
    create: { nome: sugestao.nome, slug, cidade: sugestao.cidade, estado: sugestao.estado },
  });

  await prisma.sugestaoRegiao.update({
    where: { id },
    data: { status: "APROVADA", revisadoPorId: session!.user.id, revisadoEm: new Date() },
  });

  redirect(comMensagem("/marketplace/admin/regioes", `Sugestão "${sugestao.nome}" aprovada.`));
}

export async function rejeitarSugestao(formData: FormData) {
  const session = await exigirAdmin();
  const id = String(formData.get("id") || "");
  const sugestao = await prisma.sugestaoRegiao.findUnique({ where: { id } });
  if (!sugestao || sugestao.status !== "PENDENTE") redirect("/marketplace/admin/regioes");

  await prisma.sugestaoRegiao.update({
    where: { id },
    data: { status: "REJEITADA", revisadoPorId: session!.user.id, revisadoEm: new Date() },
  });

  redirect(comMensagem("/marketplace/admin/regioes", `Sugestão "${sugestao.nome}" rejeitada.`));
}
