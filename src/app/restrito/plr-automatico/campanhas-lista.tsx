"use client";

import { useState, useTransition } from "react";
import { cancelarCampanhaAction, excluirCampanhaAction, recalcularCronogramaAction } from "./actions";

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
  const [mensagem, setMensagem] = useState<{ id: string; msg: string; erro?: boolean } | null>(null);

  function recalcular(id: string) {
    setMensagem(null);
    startTransition(async () => {
      const resultado = await recalcularCronogramaAction(id);
      if (resultado.error) setMensagem({ id, msg: resultado.error, erro: true });
    });
  }

  function cancelar(id: string, dias: Dia[]) {
    const processados = dias.filter((d) => d.processadoEm).length;
    const aviso =
      processados === 0
        ? "Cancelar essa campanha? Como nenhum dia ainda foi lançado, ela é removida por completo. Não pode ser desfeito."
        : `Cancelar essa campanha? Os ${processados} dia(s) já lançado(s) continuam no histórico; os dias ainda pendentes são removidos. Não pode ser desfeito.`;
    if (!confirm(aviso)) return;

    setMensagem(null);
    startTransition(async () => {
      const resultado = await cancelarCampanhaAction(id);
      if (resultado.error) setMensagem({ id, msg: resultado.error, erro: true });
      else if (resultado.mensagem) setMensagem({ id, msg: resultado.mensagem, erro: false });
    });
  }

  function excluir(id: string, processados: number) {
    const aviso =
      processados === 0
        ? "Excluir essa campanha? Não pode ser desfeito."
        : `Excluir essa campanha? Ela some da lista, mas os ${processados} dia(s) já lançado(s) continuam intactos como Distribuição real (dinheiro já movido não é desfeito) — só o registro da campanha em si é removido. Não pode ser desfeito.`;
    if (!confirm(aviso)) return;

    setMensagem(null);
    startTransition(async () => {
      const resultado = await excluirCampanhaAction(id);
      if (resultado.error) setMensagem({ id, msg: resultado.error, erro: true });
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
                {processados < c.dias.length && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => cancelar(c.id, c.dias)}
                    title={
                      processados === 0
                        ? "Remove a campanha por completo — nada foi lançado ainda"
                        : "Remove só os dias ainda pendentes — os já lançados continuam no histórico"
                    }
                    className="rounded-lg border border-border/60 px-2 py-1 text-xs text-muted hover:border-red-500/40 hover:text-red-300 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => excluir(c.id, processados)}
                  title="Remove o registro da campanha da lista — nunca desfaz dinheiro já movido pelos dias já lançados"
                  className="rounded-lg border border-border/60 px-2 py-1 text-xs text-muted hover:border-red-500/40 hover:text-red-300 disabled:opacity-50"
                >
                  Excluir
                </button>
              </div>
            </div>

            <p className="mt-1 text-[11px] text-muted">
              Criada por {c.criadoPor.name ?? c.criadoPor.email} · cronograma soma{" "}
              {somaCronograma.toFixed(2)}%
            </p>
            {mensagem?.id === c.id && (
              <p className={`mt-1 text-[11px] ${mensagem.erro ? "text-red-400" : "text-emerald-400"}`}>{mensagem.msg}</p>
            )}

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
