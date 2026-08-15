"use client";

import { useEffect, useRef, useState } from "react";
import { enviarMensagemGuia, carregarHistoricoGuia } from "@/app/painel/guia-actions";
import type { MensagemGuia } from "@/lib/gemini";
import { IconChat, IconSparkles, IconArrowLeft } from "@/components/icons";

type Mensagem = { role: "user" | "model"; texto: string };

const REGEX_URL = /(https?:\/\/[^\s]+)/g;

/** Deixa URLs clicáveis dentro da mensagem (ex: o link do wa.me na resposta de atendimento
 *  humano) — o resto do texto continua como texto simples. */
function renderTextoComLinks(texto: string) {
  const partes = texto.split(REGEX_URL);
  return partes.map((parte, i) =>
    REGEX_URL.test(parte) ? (
      <a
        key={i}
        href={parte}
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-gold-light/60 underline-offset-2 hover:text-gold-light"
      >
        {parte}
      </a>
    ) : (
      <span key={i}>{parte}</span>
    )
  );
}

function mensagemBoasVindas(primeiroNome: string, novato: boolean): string {
  if (novato) {
    return `Oi, ${primeiroNome}! 👋 Eu sou o Guia Foccus, seu assistente por aqui. Vi que você é novo(a) na plataforma — posso te explicar como fazer seu primeiro aporte, como funciona a carência de 90 dias, os rendimentos, ou qualquer outra dúvida. É só perguntar!`;
  }
  return `Oi, ${primeiroNome}! 👋 Sou o Guia Foccus. Posso te ajudar com dúvidas sobre aportes, saques, rendimentos, reaplicação ou qualquer outra parte da plataforma. Manda sua pergunta!`;
}

/** Lê a mensagem em voz alta usando a Web Speech API do navegador (sem custo, sem API externa).
 *  Falha silenciosamente se o navegador não suportar. */
function falar(texto: string, onFim: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onFim();
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(texto);
  utterance.lang = "pt-BR";
  utterance.rate = 1;
  utterance.onend = onFim;
  utterance.onerror = onFim;
  window.speechSynthesis.speak(utterance);
}

export function ChatGuia({ primeiroNome, novato }: { primeiroNome: string; novato: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [falando, setFalando] = useState<number | null>(null);
  const [suportaAudio, setSuportaAudio] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSuportaAudio(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (!aberto || carregado) return;
    setCarregado(true);
    carregarHistoricoGuia().then((historico) => {
      if (historico.length > 0) {
        setMensagens(historico);
      } else {
        setMensagens([{ role: "model", texto: mensagemBoasVindas(primeiroNome, novato) }]);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, carregado]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, enviando]);

  async function enviar() {
    const texto2 = texto.trim();
    if (!texto2 || enviando) return;

    const novoHistorico: MensagemGuia[] = [
      ...mensagens.map((m) => ({ role: m.role, texto: m.texto })),
      { role: "user" as const, texto: texto2 },
    ];
    setMensagens((atual) => [...atual, { role: "user", texto: texto2 }]);
    setTexto("");
    setEnviando(true);
    setErro(null);

    const resultado = await enviarMensagemGuia(novoHistorico);

    setEnviando(false);
    if (resultado.error) {
      setErro(resultado.error);
      return;
    }
    if (resultado.resposta) {
      setMensagens((atual) => [...atual, { role: "model", texto: resultado.resposta! }]);
    }
  }

  function alternarAudio(indice: number, texto: string) {
    if (falando === indice) {
      window.speechSynthesis.cancel();
      setFalando(null);
      return;
    }
    setFalando(indice);
    falar(texto, () => setFalando((atual) => (atual === indice ? null : atual)));
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        data-tour="chat-guia"
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gold text-ink shadow-2xl transition hover:brightness-110 sm:h-16 sm:w-16"
        title="Guia Foccus — tire suas dúvidas"
      >
        {aberto ? <IconArrowLeft width={22} height={22} /> : <IconChat width={24} height={24} />}
      </button>

      {aberto && (
        <div className="fixed bottom-24 right-5 z-40 flex h-[70vh] max-h-[560px] w-[92vw] max-w-sm flex-col overflow-hidden rounded-2xl border border-gold/40 bg-surface shadow-2xl sm:bottom-24">
          <div className="flex items-center gap-2 border-b border-border bg-surface-2 px-4 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/20 text-gold-light">
              <IconSparkles width={16} height={16} />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Guia Foccus</p>
              <p className="text-[11px] text-muted">Assistente da plataforma</p>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {mensagens.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-gold/20 text-foreground"
                      : "border border-border bg-surface-2 text-foreground/90"
                  }`}
                >
                  {renderTextoComLinks(m.texto)}
                  {m.role === "model" && suportaAudio && (
                    <button
                      type="button"
                      onClick={() => alternarAudio(i, m.texto)}
                      title={falando === i ? "Parar áudio" : "Ouvir esta mensagem"}
                      className="ml-2 inline-flex align-middle text-xs text-muted hover:text-gold-light"
                    >
                      {falando === i ? "⏹️" : "🔊"}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {enviando && (
              <div className="flex justify-start">
                <div className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-muted">
                  Digitando...
                </div>
              </div>
            )}
            {erro && <p className="text-xs text-red-400">{erro}</p>}
            <div ref={fimRef} />
          </div>

          <div className="flex gap-2 border-t border-border p-3">
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  enviar();
                }
              }}
              placeholder="Digite sua dúvida..."
              maxLength={1000}
              className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/60"
            />
            <button
              type="button"
              onClick={enviar}
              disabled={enviando || !texto.trim()}
              className="shrink-0 rounded-lg bg-gold px-3 py-2 text-xs font-semibold text-ink transition hover:brightness-110 disabled:opacity-50"
            >
              Enviar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
