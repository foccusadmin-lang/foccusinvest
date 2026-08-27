"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calcularCompletudePerfilPrestador } from "@/lib/marketplace/prestador";

export type ResultadoBusca = {
  id: string;
  nomeProfissional: string;
  verificado: boolean;
  notaMedia: number | null;
  totalAvaliacoes: number;
  bairroPrincipal: string | null;
  totalRegioesAtendidas: number;
  precoDe: number | null;
};

type RespostaBusca = { ok: true; resultados: ResultadoBusca[] } | { ok: false; erro: string };

/**
 * Busca ao vivo por serviço + bairro (spec "Parte 2", seções 8/9) — chamada direto do client
 * component a cada seleção, sem precisar de botão "Pesquisar" nem de ida/volta de página. Só
 * consulta o próprio banco (Prisma/Postgres), sem nenhuma API externa — sem custo.
 */
export async function buscarPrestadoresAction(
  servicoId: string,
  regiaoId: string
): Promise<RespostaBusca> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, erro: "Você precisa entrar pra pesquisar." };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.papelMarketplace !== "CLIENTE") {
    return { ok: false, erro: "Só clientes podem pesquisar prestadores." };
  }

  // Nunca confia direto no id que chega do cliente: confirma que o serviço e o bairro existem
  // e estão ativos antes de rodar a busca.
  const [servico, regiao] = await Promise.all([
    prisma.servico.findFirst({ where: { id: servicoId, ativo: true } }),
    prisma.regiao.findFirst({ where: { id: regiaoId, ativo: true } }),
  ]);
  if (!servico || !regiao) return { ok: false, erro: "Serviço ou bairro inválido." };

  const prestadores = await prisma.perfilPrestador.findMany({
    where: {
      ativo: true,
      servicos: { some: { servicoId } },
      regioesAtendidas: { some: { regiaoId } },
    },
    include: {
      regiaoPrincipal: true,
      regioesAtendidas: true,
      avaliacoesRecebidas: { select: { nota: true } },
    },
  });

  const comMetricas = prestadores.map((p) => {
    const notas = p.avaliacoesRecebidas.map((a) => a.nota);
    const notaMedia = notas.length > 0 ? notas.reduce((a, b) => a + b, 0) / notas.length : null;
    return {
      p,
      notaMedia,
      totalAvaliacoes: notas.length,
      completude: calcularCompletudePerfilPrestador(p),
    };
  });

  // Ordem dos resultados (spec "Parte 2", seção 10): já filtrado por ativo=true; depois
  // verificado > avaliação > perfil completo. "Disponibilidade" fica pra quando existir esse
  // campo, e "distância" só quando o Google Maps entrar (seção 20) — nada disso aqui hoje.
  comMetricas.sort((a, b) => {
    if (a.p.verificado !== b.p.verificado) return a.p.verificado ? -1 : 1;
    const notaA = a.notaMedia ?? -1;
    const notaB = b.notaMedia ?? -1;
    if (notaA !== notaB) return notaB - notaA;
    return b.completude - a.completude;
  });

  const resultados: ResultadoBusca[] = comMetricas.map(({ p, notaMedia, totalAvaliacoes }) => ({
    id: p.id,
    nomeProfissional: p.nomeProfissional,
    verificado: p.verificado,
    notaMedia,
    totalAvaliacoes,
    bairroPrincipal: p.regiaoPrincipal?.nome ?? null,
    totalRegioesAtendidas: p.regioesAtendidas.length,
    precoDe: p.precoDe,
  }));

  return { ok: true, resultados };
}
