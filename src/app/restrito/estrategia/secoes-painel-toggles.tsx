"use client";

import { useState, useTransition } from "react";
import { SECOES_PAINEL, type CampoSecaoPainel } from "@/lib/secoes-painel";
import { definirSecaoPainelAction } from "./actions";

export function SecoesPainelToggles({ inicial }: { inicial: Record<CampoSecaoPainel, boolean> }) {
  const [estado, setEstado] = useState(inicial);
  const [pendente, setPendente] = useState<CampoSecaoPainel | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function alternar(campo: CampoSecaoPainel) {
    const novo = !estado[campo];
    setErro(null);
    setPendente(campo);
    setEstado((atual) => ({ ...atual, [campo]: novo }));
    startTransition(async () => {
      try {
        const resultado = await definirSecaoPainelAction(campo, novo);
        if (resultado.error) {
          setEstado((atual) => ({ ...atual, [campo]: !novo }));
          setErro(resultado.error);
        }
      } catch {
        setEstado((atual) => ({ ...atual, [campo]: !novo }));
        setErro("Não foi possível salvar agora. Tente de novo.");
      } finally {
        setPendente(null);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">
        Exibição no painel do investidor
      </p>
      <p className="mt-1 text-sm text-muted">
        Ligue ou desligue cada bloco do dashboard. Desligado, ele some do painel de todos os
        investidores na hora; ligado, volta a aparecer.
      </p>

      <ul className="mt-4 divide-y divide-border">
        {SECOES_PAINEL.map((s) => {
          const ligado = estado[s.campo];
          return (
            <li key={s.campo} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{s.titulo}</p>
                <p className="text-xs text-muted">{s.descricao}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className={`text-xs font-semibold ${ligado ? "text-emerald-300" : "text-muted"}`}>
                  {ligado ? "Visível" : "Oculto"}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={ligado}
                  aria-label={`${ligado ? "Ocultar" : "Exibir"} ${s.titulo}`}
                  disabled={pendente === s.campo}
                  onClick={() => alternar(s.campo)}
                  className={`relative h-6 w-11 rounded-full transition disabled:opacity-60 ${
                    ligado ? "bg-emerald-500" : "bg-white/15"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                      ligado ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {erro && <p className="mt-3 text-sm text-red-400">{erro}</p>}
    </div>
  );
}
