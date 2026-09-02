"use client";

import { useState, useTransition } from "react";
import { formatMoeda, formatData } from "@/lib/format";
import { excluirDistribuicao } from "../distribuicoes/actions";

export type LancamentoPeriodo = {
  id: string;
  percentual: number;
  valorTotal: number;
  periodoInicio: Date;
  periodoFim: Date;
  resultadoApurado: string;
  criadoEm: Date;
  qtdParticipantes: number;
};

export function PlrPeriodoLista({ itens }: { itens: LancamentoPeriodo[] }) {
  const [pending, startTransition] = useTransition();
  const [erroId, setErroId] = useState<{ id: string; msg: string } | null>(null);

  if (itens.length === 0) {
    return <p className="text-sm text-muted">Nenhum lançamento por período ainda.</p>;
  }

  function apagar(id: string) {
    if (!confirm("Apagar esse lançamento? Remove também o rendimento já diluído a partir dele (se ainda não usado/reservado). Não pode ser desfeito.")) {
      return;
    }
    setErroId(null);
    startTransition(async () => {
      const resultado = await excluirDistribuicao(id);
      if (resultado.error) setErroId({ id, msg: resultado.error });
    });
  }

  return (
    <div className="space-y-2">
      {itens.map((item) => (
        <div key={item.id} className="rounded-xl border border-border/70 bg-surface-2 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <div>
              <span className="font-semibold text-gold-light">{item.percentual.toFixed(2)}%</span>{" "}
              <span className="text-muted">
                · {formatData(item.periodoInicio)} a {formatData(item.periodoFim)} ·{" "}
                {item.qtdParticipantes} investidor(es) · {formatMoeda(item.valorTotal)} no total
              </span>
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() => apagar(item.id)}
              className="rounded-lg bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/25 disabled:opacity-50"
            >
              Apagar
            </button>
          </div>
          <p className="mt-1 text-xs text-muted">
            {item.resultadoApurado} · lançado em {formatData(item.criadoEm)}
          </p>
          {erroId?.id === item.id && <p className="mt-1 text-xs text-red-400">{erroId.msg}</p>}
        </div>
      ))}
    </div>
  );
}
