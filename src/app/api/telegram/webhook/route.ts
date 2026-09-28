import { NextResponse } from "next/server";
import { enviarMensagemTelegram } from "@/lib/telegram";
import { responderPergunta, MENSAGEM_AJUDA } from "@/lib/telegram-perguntas";

type TelegramUpdate = {
  message?: {
    chat?: { id?: number | string };
    text?: string;
  };
};

/**
 * Webhook do bot do Telegram (@foccusinvest_bot) — o admin manda uma pergunta em texto livre
 * ("quanto entrou hoje", "resumo da semana"...) e recebe a resposta na hora. Só responde ao chat
 * do próprio admin (TELEGRAM_CHAT_ID): qualquer outro remetente é ignorado silenciosamente, sem
 * revelar nada sobre o bot. Validado por `secret_token` (cabeçalho que só o Telegram sabe, gerado
 * ao registrar o webhook via setWebhook) — sem isso, qualquer um na internet que descobrisse essa
 * URL poderia forjar mensagens.
 */
export async function POST(request: Request) {
  const segredoRecebido = request.headers.get("x-telegram-bot-api-secret-token");
  if (segredoRecebido !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = (await request.json().catch(() => null)) as TelegramUpdate | null;
  const chatId = update?.message?.chat?.id != null ? String(update.message.chat.id) : null;
  const texto = update?.message?.text;

  if (!chatId || chatId !== process.env.TELEGRAM_CHAT_ID || !texto) {
    return NextResponse.json({ ok: true });
  }

  const resposta = texto.trim() === "/start" ? `Oi! ${MENSAGEM_AJUDA}` : await responderPergunta(texto);
  await enviarMensagemTelegram(resposta);

  return NextResponse.json({ ok: true });
}
