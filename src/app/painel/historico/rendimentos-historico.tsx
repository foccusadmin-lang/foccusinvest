"use client";

import { formatMoeda, formatData } from "@/lib/format";
import { useGrupoPorData } from "./use-grupo-data";

type Credito = {
  id: string;
  valor: number;
  origem: string;
  criadoEm: Date;
  utilizadoEm: Date | null;
  solicitacaoSaqueId: string | null;
};

export function RendimentosHistorico({ itens }: { itens: Credito[] }) {
  const { grupos, expandidos, toggle } = useGrupoPorData(itens);

  if (grupos.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
        Você ainda não recebeu créditos de PLR/rendimento.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {grupos.map(([data, grupoItens]) => {
        const aberto = expandidos.has(data);
        const total = grupoItens.reduce((acc, c) => acc + c.valor, 0);
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
                  {grupoItens.length} crédito(s) · Total {formatMoeda(total)}
                </p>
              </div>
              <span className="text-muted">{aberto ? "▲" : "▼"}</span>
            </button>

            {aberto && (
              <div className="divide-y divide-border">
                {grupoItens.map((c) => {
                  const usado = Boolean(c.utilizadoEm || c.solicitacaoSaqueId);
                  return (
                    <div
                      key={c.id}
                      className="flex flex-wrap items-center justify-between gap-2 bg-surface px-4 py-3"
                    >
                      <div>
                        <p className="font-semibold text-gold-light">{formatMoeda(c.valor)}</p>
                        <p className="text-xs text-muted">
                          {formatData(c.criadoEm)} · {c.origem}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          usado ? "bg-white/10 text-muted" : "bg-emerald-500/15 text-emerald-300"
                        }`}
                      >
                        {usado ? "Já usado" : "Disponível"}
                      </span>
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
