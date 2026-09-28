/**
 * Envio de mensagem via Telegram Bot API — best-effort, mesmo padrão de lib/whatsapp.ts e
 * lib/notificacoes.ts: se as credenciais não estiverem configuradas ou o envio falhar, só loga e
 * segue em frente (nunca lança erro). Usado hoje só pro relatório financeiro diário do admin (ver
 * lib/relatorio-diario.ts), não é uma notificação de investidor.
 */
export async function enviarMensagemTelegram(texto: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.error("TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID não configurados — mensagem não enviada.");
    return;
  }

  try {
    const resposta = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: texto, parse_mode: "HTML" }),
    });

    if (!resposta.ok) {
      console.error(`Falha ao enviar Telegram (status ${resposta.status}):`, await resposta.text());
    }
  } catch (e) {
    console.error("Falha ao enviar Telegram:", e);
  }
}
