"use client";

import { useEffect, useState } from "react";
import { marcarTourConcluido } from "@/app/painel/guia-actions";

type Passo = {
  seletor: string;
  titulo: string;
  texto: string;
};

const PASSOS: Passo[] = [
  {
    seletor: '[data-tour="resumo"]',
    titulo: "Seu Resumo",
    texto: "Aqui você acompanha seu Capital, Rendimentos e Bônus em tempo real.",
  },
  {
    seletor: '[data-tour="nova-aplicacao"]',
    titulo: "Fazer um aporte",
    texto: "Clique aqui pra fazer sua primeira aplicação — mínimo de R$ 50,00, via Pix.",
  },
  {
    seletor: '[data-tour="acoes-rapidas"]',
    titulo: "Ações rápidas",
    texto: "Saques, reaplicação e outras operações ficam sempre por aqui.",
  },
  {
    seletor: '[data-tour="historico"]',
    titulo: "Histórico",
    texto: "Todo o extrato de aportes, rendimentos, bônus e saques fica registrado aqui.",
  },
  {
    seletor: '[data-tour="chat-guia"]',
    titulo: "Guia Foccus",
    texto: "Ficou com alguma dúvida? Clique aqui a qualquer momento pra conversar com o assistente.",
  },
];

type Retangulo = { top: number; left: number; width: number; height: number };

function medirElemento(seletor: string): Retangulo | null {
  const el = document.querySelector(seletor);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export function TourGuiado({ ativoInicial }: { ativoInicial: boolean }) {
  const [ativo, setAtivo] = useState(false);
  const [passo, setPasso] = useState(0);
  const [retangulo, setRetangulo] = useState<Retangulo | null>(null);

  // Só liga depois do mount pra dar tempo do resto da página (e os data-tour) renderizarem.
  useEffect(() => {
    if (!ativoInicial) return;
    const timeout = setTimeout(() => setAtivo(true), 600);
    return () => clearTimeout(timeout);
  }, [ativoInicial]);

  useEffect(() => {
    if (!ativo) return;

    function atualizar() {
      const alvo = PASSOS[passo];
      if (!alvo) return;
      const rect = medirElemento(alvo.seletor);
      if (!rect) {
        // Elemento não existe nessa tela (ex: usuário navegou pra outra página) — pula o passo.
        proximo();
        return;
      }
      setRetangulo(rect);
    }

    atualizar();
    window.addEventListener("resize", atualizar);
    window.addEventListener("scroll", atualizar, true);
    return () => {
      window.removeEventListener("resize", atualizar);
      window.removeEventListener("scroll", atualizar, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo, passo]);

  function proximo() {
    if (passo + 1 >= PASSOS.length) {
      finalizar();
      return;
    }
    setPasso((p) => p + 1);
  }

  function finalizar() {
    setAtivo(false);
    marcarTourConcluido();
  }

  if (!ativo || !retangulo) return null;

  const atual = PASSOS[passo];
  const tooltipTop = retangulo.top + retangulo.height + 12;
  const tooltipTopAcima = retangulo.top - 12;
  const mostrarAbaixo = tooltipTop + 140 < window.innerHeight;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/70" onClick={finalizar} />
      <div
        className="absolute rounded-xl ring-4 ring-gold/80 transition-all duration-300"
        style={{
          top: retangulo.top - 6,
          left: retangulo.left - 6,
          width: retangulo.width + 12,
          height: retangulo.height + 12,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.7)",
        }}
      />
      <div
        className="absolute w-[min(90vw,320px)] rounded-2xl border border-gold/40 bg-surface p-4 shadow-2xl transition-all duration-300"
        style={{
          top: mostrarAbaixo ? tooltipTop : undefined,
          bottom: mostrarAbaixo ? undefined : window.innerHeight - tooltipTopAcima,
          left: Math.min(Math.max(retangulo.left, 12), window.innerWidth - 332),
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-gold-light">
          Passo {passo + 1} de {PASSOS.length}
        </p>
        <p className="mt-1 text-sm font-semibold text-foreground">{atual.titulo}</p>
        <p className="mt-1 text-sm text-muted">{atual.texto}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={finalizar}
            className="text-xs text-muted hover:text-foreground"
          >
            Pular tour
          </button>
          <button
            type="button"
            onClick={proximo}
            className="rounded-lg bg-gold px-3 py-1.5 text-xs font-semibold text-ink hover:brightness-110"
          >
            {passo + 1 >= PASSOS.length ? "Concluir" : "Próximo"}
          </button>
        </div>
      </div>
    </div>
  );
}
