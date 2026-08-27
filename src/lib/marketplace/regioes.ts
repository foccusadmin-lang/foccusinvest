import { prisma } from "@/lib/prisma";
import { MARKETPLACE_CITY, MARKETPLACE_STATE } from "./config";
import { normalizarTexto } from "./texto";

/**
 * Slug de bairro — "Novo Horizonte", "novo horizonte" e "NOVO HORIZONTE" geram todos
 * "novo-horizonte" (spec "Parte 2", seção 17). Único por cidade, não globalmente: nada impede
 * "Centro" de existir em Jandira e em outra cidade no futuro.
 */
export function slugificarRegiao(nome: string): string {
  return normalizarTexto(nome)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Lista as regiões ativas da cidade atendida — usada em todo picker de bairro (cliente,
 *  prestador, admin). Vem sempre do banco, nunca de uma lista fixa no código (seção 3). */
export async function listarRegioesAtivas() {
  return prisma.regiao.findMany({
    where: { cidade: MARKETPLACE_CITY, ativo: true },
    orderBy: { nome: "asc" },
  });
}

/** Confere se já existe uma região com o mesmo slug na mesma cidade (ativa ou não), pra evitar
 *  duplicata antes de criar uma nova (seção 17). `excluirId` deixa passar a própria região ao
 *  editar. */
export async function regiaoDuplicada(
  cidade: string,
  slug: string,
  excluirId?: string
): Promise<boolean> {
  const existente = await prisma.regiao.findUnique({
    where: { cidade_slug: { cidade, slug } },
  });
  return Boolean(existente && existente.id !== excluirId);
}

export function regiaoPertenceACidadeAtendida(cidade: string): boolean {
  return normalizarTexto(cidade) === normalizarTexto(MARKETPLACE_CITY);
}

export const REGIAO_ESTADO_PADRAO = MARKETPLACE_STATE;
