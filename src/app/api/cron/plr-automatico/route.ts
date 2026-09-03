import { NextResponse } from "next/server";
import { processarDiasPendentes } from "@/lib/plr-automatico";

/** Roda uma vez por dia, às 19h45 (horário de Brasília) — ver vercel.json. Plano do Vercel só
 *  permite cron diário (não dá pra checar de hora em hora), então `horarioLancamento` da
 *  campanha na prática vira "elegível pro lote do dia" quando esse horário configurado já tiver
 *  passado até 19h45 — configurar um horário depois disso só materializa no dia seguinte.
 *
 *  Não é a única forma do PLR automático rodar: `processarDiasPendentes` também é chamada como
 *  fallback de toda página administrativa (ver restrito/layout.tsx), porque um cron que falha
 *  silenciosamente não pode ser o único jeito disso funcionar — já aconteceu de verdade numa
 *  campanha real. A checagem de modoPLR e a idempotência (cada dia só processado uma vez) moram
 *  dentro de processarDiasPendentes, não aqui. */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const resultado = await processarDiasPendentes();
  return NextResponse.json({ ok: true, ...resultado });
}
