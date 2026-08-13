import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getConfiguracao } from "@/lib/configuracao";
import { liberarIncentivoParaTodosLideres, ORIGEM_INCENTIVO_PREFIXO } from "@/lib/incentivo-lideranca";

/** Incentivo de liderança automático: 0,10% sobre o capital de cada líder, todo dia útil
 *  (segunda a sexta) às 19h de Brasília, via Vercel Cron (ver vercel.json) — só roda de fato se
 *  o admin deixou o modo "Automático" ligado em Painel administrativo; no manual, fica por conta
 *  do botão "% Liberar incentivo pra todos" (aba Liderança). */
const PERCENTUAL_AUTOMATICO = 0.1;

function hojeBrasiliaStr(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const config = await getConfiguracao();
  if (config.modoIncentivoLideranca !== "AUTOMATICO") {
    return NextResponse.json({ ok: true, pulou: "modo manual" });
  }

  // Idempotência: se já rodou hoje (mesmo dia em Brasília), não credita de novo — evita
  // duplicar em caso de retry do próprio Vercel Cron ou execução manual da rota.
  const inicioDoDia = new Date(`${hojeBrasiliaStr()}T00:00:00-03:00`);
  const jaRodouHoje = await prisma.creditoCarteira.findFirst({
    where: {
      origem: { startsWith: `${ORIGEM_INCENTIVO_PREFIXO} ${PERCENTUAL_AUTOMATICO}% (automático)` },
      criadoEm: { gte: inicioDoDia },
    },
  });
  if (jaRodouHoje) {
    return NextResponse.json({ ok: true, pulou: "já liberado hoje" });
  }

  const resultado = await liberarIncentivoParaTodosLideres(
    PERCENTUAL_AUTOMATICO,
    new Date(),
    " (automático)"
  );

  await prisma.logAuditoria.create({
    data: {
      acao: "liberar_incentivo_lideranca_automatico",
      detalhes: `${PERCENTUAL_AUTOMATICO}% para ${resultado.creditados} líder(es), total ${resultado.total.toFixed(2)}`,
    },
  });

  return NextResponse.json({ ok: true, ...resultado });
}
