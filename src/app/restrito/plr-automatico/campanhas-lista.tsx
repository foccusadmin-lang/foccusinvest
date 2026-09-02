"use client";

import { useState, useTransition } from "react";
import { desativarCampanhaAction, recalcularCronogramaAction } from "./actions";

type Dia = { id: string; data: Date; percentual: number; processadoEm: Date | null };
type Campanha = {
  id: string;
  percentualTotal: number;
  periodoInicio: Date;
  periodoFim: Date;
  horarioLancamento: string;
  ativa: boolean;
  criadoEm: Date;
  criadoPor: { name: string | null; email: string };
  dias: Dia[];
};

const DIA_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function formatData(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(data);
}

export function CampanhasLista({ campanhas }: { campanhas: Campanha[] }) {
  const [expandidaId, setExpandidaId] = useState<string | null>(campanhas[0]?.id ?? null);
  const [pending, startTransition] = useTransition();
  const [erroRecalculo, setErroRecalculo] = useState<{ id: string; msg: string } | null>(null);

  function recalcular(id: string) {
    setErroRecalculo(null);
    startTransition(async () => {
      const resultado = await recalcularCronogramaAction(id);
      if (resultado.error) setErroRecalculo({ id, msg: resultado.error });
    });
  }

  if (campanhas.length === 0) {
    return <p className="text-sm text-muted">Nenhuma campanha criada ainda.</p>;
  }

  return (
    <div className="space-y-3">
      {campanhas.map((c) => {
        const somaCronograma = c.dias.reduce((acc, d) => acc + d.percentual, 0);
        const processados = c.dias.filter((d) => d.processadoEm).length;
        const expandida = expandidaId === c.id;

        return (
          <div key={c.id} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setExpandidaId(expandida ? null : c.id)}
                className="flex items-center gap-2 text-left"
              >
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    c.ativa ? "bg-emerald-500/15 text-emerald-300" : "bg-surface-2 text-muted"
                  }`}
                >
                  {c.ativa ? "Ativa" : "Inativa"}
                </span>
                <span className="font-semibold text-foreground">
                  {c.percentualTotal.toFixed(2)}% · {formatData(c.periodoInicio)} a{" "}
                  {formatData(c.periodoFim)}
                </span>
                <span className="text-xs text-muted">às {c.horarioLancamento}</span>
              </button>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted">
                  {processados}/{c.dias.length} dias lançados
                </span>
                {processados < c.dias.length && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => recalcular(c.id)}
                    title="Regera o percentual só dos dias ainda não lançados, respeitando o mesmo total da campanha"
                    className="rounded-lg border border-border/60 px-2 py-1 text-xs text-muted hover:border-gold/40 hover:text-gold-light disabled:opacity-50"
                  >
                    Recalcular cronograma
                  </button>
                )}
                {c.ativa && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => startTransition(() => desativarCampanhaAction(c.id))}
                    className="rounded-lg border border-border/60 px-2 py-1 text-xs text-muted hover:border-red-500/40 hover:text-red-300 disabled:opacity-50"
                  >
                    Desativar
                  </button>
                )}
              </div>
            </div>

            <p className="mt-1 text-[11px] text-muted">
              Criada por {c.criadoPor.name ?? c.criadoPor.email} · cronograma soma{" "}
              {somaCronograma.toFixed(2)}%
            </p>
            {erroRecalculo?.id === c.id && <p className="mt-1 text-[11px] text-red-400">{erroRecalculo.msg}</p>}

            {expandida && (
              <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-border/70">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-surface-2 text-[10px] uppercase tracking-wider text-muted">
                    <tr>
                      <th className="px-3 py-2">Data</th>
                      <th className="px-3 py-2">Dia</th>
                      <th className="px-3 py-2">%</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {c.dias.map((d) => (
                      <tr key={d.id}>
                        <td className="px-3 py-1.5 text-muted">{formatData(d.data)}</td>
                        <td className="px-3 py-1.5 text-muted">{DIA_SEMANA[d.data.getUTCDay()]}</td>
                        <td className="px-3 py-1.5 font-semibold text-foreground">
                          {d.percentual.toFixed(2)}%
                        </td>
                        <td className="px-3 py-1.5">
                          {d.processadoEm ? (
                            <span className="text-emerald-400">Lançado</span>
                          ) : (
                            <span className="text-muted">Pendente</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
