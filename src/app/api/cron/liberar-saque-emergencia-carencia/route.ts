import { NextResponse } from "next/server";
import { liberarSaquesEmergenciaCarenciaVencidos } from "@/lib/emergencia";

/** Roda em dias úteis (ver vercel.json). Também roda como fallback em toda página administrativa
 *  (restrito/layout.tsx) — um cron que falha em silêncio não pode ser o único caminho. A checagem
 *  do modo automático e a idempotência moram dentro de liberarSaquesEmergenciaCarenciaVencidos. */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const resultado = await liberarSaquesEmergenciaCarenciaVencidos();
  return NextResponse.json({ ok: true, ...resultado });
}
