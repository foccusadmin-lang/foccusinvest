"use client";

import { formatMoeda } from "@/lib/format";
import { useGrupoPorData } from "./use-grupo-data";

type Saque = {
  id: string;
  valor: number;
  moeda: string;
  tipo: string;
  status: string;
  criadoEm: Date;
  emergencial: boolean;
  justificativaRecusa: string | null;
};

const STATUS_SAQUE: Record<string, { label: string; className: string }> = {
  SOLICITADO: { label: "Solicitado", className: "bg-sky-500/15 text-sky-300" },
  APROVADO: { label: "Aprovado", className: "bg-amber-500/15 text-amber-300" },
  PAGO: { label: "Pago", className: "bg-emerald-500/15 text-emerald-300" },
  RECUSADO: { label: "Recusado", className: "bg-red-500/15 text-red-300" },
  CANCELADO: { label: "Cancelado", className: "bg-white/10 text-muted" },
};

const TIPO_SAQUE_LABEL: Record<string, string> = {
  CAPITAL: "Capital",
  RENDIMENTO: "Rendimento",
  BONUS: "Bônus",
};

export function SaquesHistorico({ itens }: { itens: Saque[] }) {
  const { grupos, expandidos, toggle } = useGrupoPorData(itens);

  if (grupos.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
        Você ainda não solicitou saques.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {grupos.map(([data, grupoItens]) => {
        const aberto = expandidos.has(data);
        const total = grupoItens.reduce((acc, s) => acc + s.valor, 0);
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
                  {grupoItens.length} saque(s) · Total {formatMoeda(total)}
                </p>
              </div>
              <span className="text-muted">{aberto ? "▲" : "▼"}</span>
            </button>

            {aberto && (
              <div className="divide-y divide-border">
                {grupoItens.map((s) => {
                  const status = STATUS_SAQUE[s.status] ?? {
                    label: s.status,
                    className: "bg-white/10 text-muted",
                  };
                  return (
                    <div
                      key={s.id}
                      className="flex flex-wrap items-center justify-between gap-2 bg-surface px-4 py-3"
                    >
                      <div>
                        <p className="font-semibold text-foreground">
                          {formatMoeda(s.valor, s.moeda as "BRL")}
                        </p>
                        <p className="text-xs text-muted">
                          {TIPO_SAQUE_LABEL[s.tipo] ?? s.tipo}
                          {s.emergencial && " · Emergência"}
                        </p>
                        {s.justificativaRecusa && (
                          <p className="mt-0.5 text-xs text-red-300/90">{s.justificativaRecusa}</p>
                        )}
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
                      >
                        {status.label}
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
