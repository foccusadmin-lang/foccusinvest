import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sincronizarDistribuicoesDoUsuario } from "@/lib/distribuicao";

/** Roda todo dia às 19h30 (horário de Brasília) via Vercel Cron (ver vercel.json) — credita a
 *  fatia diária das distribuições ativas pra todo mundo de uma vez, em vez de depender de cada
 *  investidor abrir o painel pra receber. Idempotente: sincronizarDistribuicoesDoUsuario só
 *  credita os dias ainda não creditados. */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const agora = new Date();
  const participantes = await prisma.distribuicaoParticipante.findMany({
    where: { distribuicao: { status: "ATIVA", periodoInicio: { lte: agora } } },
    select: { userId: true },
    distinct: ["userId"],
  });

  let sincronizados = 0;
  for (const { userId } of participantes) {
    await prisma.$transaction((tx) => sincronizarDistribuicoesDoUsuario(tx, userId));
    sincronizados++;
  }

  return NextResponse.json({ ok: true, sincronizados });
}
