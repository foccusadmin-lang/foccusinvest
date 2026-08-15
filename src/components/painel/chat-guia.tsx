"use client";

import { useEffect, useRef, useState } from "react";
import { enviarMensagemGuia } from "@/app/painel/guia-actions";
import type { MensagemGuia } from "@/lib/gemini";
import { IconChat, IconSparkles, IconArrowLeft } from "@/components/icons";

type Mensagem = { role: "user" | "model"; texto: string };

function mensagemBoasVindas(primeiroNome: string, novato: boolean): string {
  if (novato) {
    return `Oi, ${primeiroNome}! 👋 Eu sou o Guia Foccus, seu assistente por aqui. Vi que você é novo(a) na plataforma — posso te explicar como fazer seu primeiro aporte, como funciona a carência de 90 dias, os rendimentos, ou qualquer outra dúvida. É só perguntar!`;
  }
  return `Oi, ${primeiroNome}! 👋 Sou o Guia Foccus. Posso te ajudar com dúvidas sobre aportes, saques, rendimentos, reaplicação ou qualquer outra parte da plataforma. Manda sua pergunta!`;
}

export function ChatGuia({ primeiroNome, novato }: { primeiroNome: string; novato: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (aberto && mensagens.length === 0) {
      setMensagens([{ role: "model", texto: mensagemBoasVindas(primeiroNome, novato) }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

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
                  {m.texto}
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
