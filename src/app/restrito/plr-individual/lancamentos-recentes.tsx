"use client";

import { useMemo, useState } from "react";
import { formatMoeda, formatData } from "@/lib/format";
import { ExcluirCreditoButton } from "./excluir-button";

type Lancamento = {
  id: string;
  valor: number;
  origem: string;
  criadoEm: Date;
  utilizadoEm: Date | null;
  solicitacaoSaqueId: string | null;
  user: { name: string | null; email: string };
};

export function LancamentosRecentes({ lancamentos }: { lancamentos: Lancamento[] }) {
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const grupos = useMemo(() => {
    const mapa = new Map<string, Lancamento[]>();
    for (const l of lancamentos) {
      const chave = formatData(l.criadoEm);
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave)!.push(l);
    }
    return Array.from(mapa.entries());
  }, [lancamentos]);

  function toggle(chave: string) {
    setExpandidos((atual) => {
      const novo = new Set(atual);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });
  }

  if (grupos.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
        Nenhum PLR individual lançado ainda.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {grupos.map(([data, itens]) => {
        const total = itens.reduce((acc, i) => acc + i.valor, 0);
        const aberto = expandidos.has(data);
        return (
          <div key={data} className="overflow-hidden rounded-2xl border border-border">
            <button
              type="button"
              onClick={() => toggle(data)}
              className="flex w-full items-center justify-between bg-surface-2 px-4 py-3 text-left transition hover:bg-surface-2/70"
            >
              <div>
                <p className="font-semibold text-foreground">{data}</p>
                <p className="text-xs text-muted">
                  {itens.length} investidor(es) · Total {formatMoeda(total)}
                </p>
              </div>
              <span className="text-muted">{aberto ? "▲" : "▼"}</span>
            </button>

            {aberto && (
              <div className="divide-y divide-border">
                {itens.map((c) => {
                  const usado = Boolean(c.utilizadoEm || c.solicitacaoSaqueId);
                  return (
                    <div
                      key={c.id}
                      className="flex flex-wrap items-center justify-between gap-2 bg-surface px-4 py-3"
                    >
                      <div>
                        <p className="text-sm text-foreground">{c.user.name ?? c.user.email}</p>
                        <p className="text-xs text-muted">{c.origem}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gold-light">
                          {formatMoeda(c.valor)}
                        </span>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            usado
                              ? "bg-white/10 text-muted"
                              : "bg-emerald-500/15 text-emerald-300"
                          }`}
                        >
                          {usado ? "Já usado" : "Disponível"}
                        </span>
                        {!usado && <ExcluirCreditoButton creditoId={c.id} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
