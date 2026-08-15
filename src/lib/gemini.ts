/**
 * Cliente mínimo pra API do Gemini (Google) — usa fetch direto contra a REST API em vez de
 * puxar o SDK inteiro, já que só precisamos de generateContent com histórico + system
 * instruction. Modelo "gemini-flash-latest": rápido/barato, sempre aponta pro Flash mais
 * recente (não precisa atualizar o nome do modelo manualmente no futuro).
 */
const MODELO = "gemini-flash-latest";

export type MensagemGuia = { role: "user" | "model"; texto: string };

export class GeminiIndisponivelError extends Error {}

export async function perguntarGemini(
  systemInstruction: string,
  historico: MensagemGuia[]
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiIndisponivelError("Assistente indisponível no momento (chave não configurada).");
  }

  const resposta = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: historico.map((m) => ({ role: m.role, parts: [{ text: m.texto }] })),
        generationConfig: { temperature: 0.4, maxOutputTokens: 700 },
      }),
    }
  );

  if (!resposta.ok) {
    const corpo = await resposta.text();
    console.error(`Falha na API do Gemini (status ${resposta.status}):`, corpo);
    throw new GeminiIndisponivelError("Assistente indisponível no momento. Tente novamente em instantes.");
  }

  const dados = await resposta.json();
  const texto = dados?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? "")
    .join("")
    .trim();

  if (!texto) {
    // Acontece quando o Gemini bloqueia a resposta por segurança (finishReason: SAFETY, etc).
    console.error("Resposta do Gemini sem texto:", JSON.stringify(dados));
    throw new GeminiIndisponivelError("Não consegui gerar uma resposta pra essa pergunta. Tenta reformular?");
  }

  return texto;
}
