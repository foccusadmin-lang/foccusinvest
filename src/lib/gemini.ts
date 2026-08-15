/**
 * Cliente mínimo pra API do Gemini (Google) — usa fetch direto contra a REST API em vez de
 * puxar o SDK inteiro, já que só precisamos de generateContent com histórico + system
 * instruction. Modelo "gemini-flash-latest": rápido/barato, sempre aponta pro Flash mais
 * recente (não precisa atualizar o nome do modelo manualmente no futuro).
 */
const MODELO = "gemini-flash-latest";
// Modelo mais leve/alta-vazão, usado só como reserva quando o principal está em pico de demanda
// (503 repetido) — geralmente tem folga de capacidade justamente por ser o modelo "econômico".
const MODELO_RESERVA = "gemini-flash-lite-latest";

export type MensagemGuia = { role: "user" | "model"; texto: string };

export class GeminiIndisponivelError extends Error {}

/** Status HTTP que valem retry — sobrecarga temporária (503) e rate limit (429). Erros como 400
 *  (chave inválida, payload errado) não adianta tentar de novo, é erro de verdade. */
const STATUS_TRANSITORIOS = new Set([429, 503]);

async function chamarGemini(
  apiKey: string,
  modelo: string,
  systemInstruction: string,
  historico: MensagemGuia[]
): Promise<Response> {
  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-goog-api-key": apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: historico.map((m) => ({ role: m.role, parts: [{ text: m.texto }] })),
      generationConfig: { temperature: 0.4, maxOutputTokens: 700 },
    }),
  });
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Tenta um modelo específico algumas vezes com backoff, só insistindo em erros transitórios
 *  (503/429) — erro de configuração (400, chave inválida etc) já desiste na primeira. */
async function tentarModelo(
  apiKey: string,
  modelo: string,
  systemInstruction: string,
  historico: MensagemGuia[],
  maxTentativas: number
): Promise<Response | null> {
  let resposta: Response | null = null;

  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    resposta = await chamarGemini(apiKey, modelo, systemInstruction, historico);
    if (resposta.ok) return resposta;

    const corpo = await resposta.text();
    const transitorio = STATUS_TRANSITORIOS.has(resposta.status);
    console.error(
      `Falha na API do Gemini (modelo ${modelo}, status ${resposta.status}, tentativa ${tentativa}/${maxTentativas}):`,
      corpo
    );

    if (!transitorio || tentativa === maxTentativas) return resposta;
    await esperar(800 * tentativa); // 800ms, depois 1600ms
  }

  return resposta;
}

/** O modelo "-latest" às vezes fica sobrecarregado (503 "high demand") em horários de pico —
 *  isso é comum e passa em segundos, não é um problema de configuração. Tenta de novo algumas
 *  vezes com backoff e, se ainda assim não conseguir, cai pro modelo reserva (mais leve, costuma
 *  ter folga de capacidade justamente por isso) antes de desistir de vez. */
export async function perguntarGemini(
  systemInstruction: string,
  historico: MensagemGuia[]
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiIndisponivelError("Assistente indisponível no momento (chave não configurada).");
  }

  let resposta = await tentarModelo(apiKey, MODELO, systemInstruction, historico, 3);

  if (!resposta || !resposta.ok) {
    console.error(`Modelo principal (${MODELO}) esgotou tentativas — caindo pro modelo reserva (${MODELO_RESERVA}).`);
    resposta = await tentarModelo(apiKey, MODELO_RESERVA, systemInstruction, historico, 2);
  }

  if (!resposta || !resposta.ok) {
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
