import { NextResponse } from "next/server";
import { getConfiguracao } from "@/lib/configuracao";
import { processarDiasPendentes } from "@/lib/plr-automatico";

/** Roda a cada 30 minutos (ver vercel.json) — só faz alguma coisa se ConfiguracaoSistema.modoPLR
 *  estiver em AUTOMATICO. Materializa (cria a Distribuição de fato) todo dia de campanha ativa
 *  cujo horário configurado já passou (horário de Brasília) e que ainda não foi lançado.
 *  Idempotente: cada dia só é processado uma vez. */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const configuracao = await getConfiguracao();
  if (configuracao.modoPLR !== "AUTOMATICO") {
    return NextResponse.json({ ok: true, ignorado: "modoPLR está em MANUAL" });
  }

  const resultado = await processarDiasPendentes();
  return NextResponse.json({ ok: true, ...resultado });
}
