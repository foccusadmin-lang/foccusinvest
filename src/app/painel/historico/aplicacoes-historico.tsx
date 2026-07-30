"use client";

import { formatMoeda, formatData } from "@/lib/format";
import { useGrupoPorData } from "./use-grupo-data";

type Aplicacao = {
  id: string;
  valor: number;
  moeda: string;
  origem: string;
  status: string;
  criadoEm: Date;
  liberaEm: Date;
  motivoRejeicao: string | null;
};

const STATUS_APLICACAO: Record<string, { label: string; className: string }> = {
  AGUARDANDO_APROVACAO: { label: "Aguardando aprovação", className: "bg-amber-500/15 text-amber-300" },
  CONFIRMADA: { label: "Confirmada", className: "bg-emerald-500/15 text-emerald-300" },
  SAQUE_SOLICITADO: { label: "Confirmada", className: "bg-emerald-500/15 text-emerald-300" },
  RETIRADA: { label: "Encerrada", className: "bg-white/10 text-muted" },
  REJEITADA: { label: "Rejeitada", className: "bg-red-500/15 text-red-300" },
};

const ORIGEM_LABEL: Record<string, string> = {
  NOVA_APLICACAO: "Nova aplicação",
  REAPLICACAO: "Reaplicação",
  MIGRACAO: "Migração",
  AJUSTE_ADMIN: "Ajuste (admin)",
};

export function AplicacoesHistorico({ itens }: { itens: Aplicacao[] }) {
  const { grupos, expandidos, toggle } = useGrupoPorData(itens);

  if (grupos.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
        Você ainda não tem aplicações.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {grupos.map(([data, grupoItens]) => {
        const aberto = expandidos.has(data);
        const total = grupoItens
          .filter((a) => a.status === "CONFIRMADA" || a.status === "SAQUE_SOLICITADO")
          .reduce((acc, a) => acc + a.valor, 0);
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
                  {grupoItens.length} aplicação(ões) · Total {formatMoeda(total)}
                </p>
              </div>
              <span className="text-muted">{aberto ? "▲" : "▼"}</span>
            </button>

            {aberto && (
              <div className="divide-y divide-border">
                {grupoItens.map((a) => {
                  const status = STATUS_APLICACAO[a.status] ?? {
                    label: a.status,
                    className: "bg-white/10 text-muted",
                  };
                  return (
                    <div
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-2 bg-surface px-4 py-3"
                    >
                      <div>
                        <p className="font-semibold text-foreground">
                          {formatMoeda(a.valor, a.moeda as "BRL")}
                        </p>
                        <p className="text-xs text-muted">{ORIGEM_LABEL[a.origem] ?? a.origem}</p>
                        {a.status === "CONFIRMADA" && (
                          <p className="mt-0.5 text-xs text-muted">
                            Liberação em {formatData(a.liberaEm)}
                          </p>
                        )}
                        {a.status === "REJEITADA" && a.motivoRejeicao && (
                          <p className="mt-0.5 text-xs text-red-300/90">{a.motivoRejeicao}</p>
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
