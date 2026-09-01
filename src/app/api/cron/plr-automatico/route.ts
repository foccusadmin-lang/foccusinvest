import { NextResponse } from "next/server";
import { getConfiguracao } from "@/lib/configuracao";
import { processarDiasPendentes } from "@/lib/plr-automatico";

/** Roda uma vez por dia, às 19h45 (horário de Brasília) — ver vercel.json. Plano do Vercel só
 *  permite cron diário (não dá pra checar de hora em hora), então `horarioLancamento` da
 *  campanha na prática vira "elegível pro lote do dia" quando esse horário configurado já tiver
 *  passado até 19h45 — configurar um horário depois disso só materializa no dia seguinte. Só faz
 *  alguma coisa se ConfiguracaoSistema.modoPLR estiver em AUTOMATICO. Idempotente: cada dia só é
 *  processado uma vez. */
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
