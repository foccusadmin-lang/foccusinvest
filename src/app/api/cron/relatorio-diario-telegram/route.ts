import { NextResponse } from "next/server";
import { enviarRelatorioDiario } from "@/lib/relatorio-diario";

/** Roda todo dia, perto da meia-noite de Brasília (ver vercel.json) — resumo financeiro do dia
 *  (aportes, saques, taxas, receita de serviços, fundo de caixa) enviado por Telegram pro admin.
 *  Idempotente por dia (ver enviarRelatorioDiario). */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  await enviarRelatorioDiario();
  return NextResponse.json({ ok: true });
}
