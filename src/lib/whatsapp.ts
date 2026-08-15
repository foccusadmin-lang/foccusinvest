/**
 * Envio de WhatsApp via Z-API (https://z-api.io) — best-effort, mesmo padrão do e-mail
 * (lib/email.tsx): se as credenciais não estiverem configuradas ou o envio falhar, só loga e
 * segue em frente. Nunca lança erro — a operação que disparou o aviso (aporte/saque) já foi
 * persistida no banco de qualquer forma, o WhatsApp é só uma notificação extra.
 */
export async function enviarWhatsApp(telefoneRaw: string, mensagem: string): Promise<void> {
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  if (!instanceId || !token) {
    console.error("ZAPI_INSTANCE_ID/ZAPI_TOKEN não configurados — WhatsApp não enviado.");
    return;
  }

  const telefone = normalizarTelefoneBR(telefoneRaw);
  if (!telefone) {
    console.error(`Telefone inválido para WhatsApp: "${telefoneRaw}"`);
    return;
  }

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (process.env.ZAPI_CLIENT_TOKEN) {
      headers["Client-Token"] = process.env.ZAPI_CLIENT_TOKEN;
    }

    const resposta = await fetch(
      `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ phone: telefone, message: mensagem }),
      }
    );

    if (!resposta.ok) {
      console.error(`Falha ao enviar WhatsApp (status ${resposta.status}):`, await resposta.text());
    }
  } catch (e) {
    console.error("Falha ao enviar WhatsApp:", e);
  }
}

/** Normaliza pro formato esperado pela Z-API (DDI + DDD + número, só dígitos). Aceita o
 *  telefone já com 55 na frente ou sem (assume Brasil, que é o único mercado da plataforma).
 *  Retorna null se não parecer um número válido — nesse caso o WhatsApp simplesmente não é
 *  enviado (não trava o fluxo). */
function normalizarTelefoneBR(telefoneRaw: string): string | null {
  const digitos = telefoneRaw.replace(/\D/g, "");
  if (!digitos) return null;
  if (digitos.startsWith("55") && (digitos.length === 12 || digitos.length === 13)) {
    return digitos;
  }
  if (digitos.length === 10 || digitos.length === 11) {
    return `55${digitos}`;
  }
  return null;
}
