import { NextResponse } from "next/server";
import { liberarIncentivoAutomaticoSeNecessario } from "@/lib/incentivo-lideranca";

/** Incentivo de liderança automático: 0,10% sobre o capital de cada líder, todo dia útil
 *  (segunda a sexta) às 19h de Brasília, via Vercel Cron (ver vercel.json) — só roda de fato se
 *  o admin deixou o modo "Automático" ligado em Painel administrativo; no manual, fica por conta
 *  do botão "% Liberar incentivo pra todos" (aba Liderança).
 *
 *  A lógica de verdade mora em liberarIncentivoAutomaticoSeNecessario (lib/incentivo-lideranca.ts)
 *  — a mesma função também roda como fallback quando o admin abre o painel, pra não depender só
 *  desse cron (que pode falhar silenciosamente se CRON_SECRET não estiver configurado na Vercel,
 *  por exemplo). */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const resultado = await liberarIncentivoAutomaticoSeNecessario();
  return NextResponse.json({ ok: true, ...resultado });
}
