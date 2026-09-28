"use server";

import { auth } from "@/auth";
import { calcularRelatorioDiario, formatarRelatorioDiario } from "@/lib/relatorio-diario";
import { enviarMensagemTelegram } from "@/lib/telegram";

/** Envio manual (sob demanda) do relatório diário via Telegram — pra o admin conferir o texto e
 *  testar a conexão sem esperar o cron da meia-noite. Não passa pelo controle de "já enviado hoje"
 *  do envio automático (ver enviarRelatorioDiario, em lib/relatorio-diario.ts) — é só um teste. */
export async function testarRelatorioDiarioTelegram(): Promise<{ error?: string; sucesso?: string }> {
  const session = await auth();
  if (session?.user?.perfil !== "ADMIN") return { error: "Acesso negado." };

  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    return { error: "TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID não configurados neste ambiente." };
  }

  const relatorio = await calcularRelatorioDiario();
  await enviarMensagemTelegram(formatarRelatorioDiario(relatorio));

  return { sucesso: "Relatório enviado pro Telegram — confira o chat do bot." };
}
