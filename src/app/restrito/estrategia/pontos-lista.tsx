"use client";

import { useActionState, useTransition } from "react";
import { formatData } from "@/lib/format";
import { adicionarPontoAction, excluirPontoAction, type EstrategiaState } from "./actions";

type Ponto = { id: string; data: Date; variacaoDia: number };

function hojeStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function PontosLista({ estrategiaId, pontos }: { estrategiaId: string; pontos: Ponto[] }) {
  const [state, action, pending] = useActionState<EstrategiaState, FormData>(
    adicionarPontoAction,
    undefined
  );
  const [excluindoPending, startTransition] = useTransition();

  return (
    <div>
      <form action={action} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="estrategiaId" value={estrategiaId} />
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-foreground/90">Data</span>
          <input
            name="data"
            type="date"
            defaultValue={hojeStr()}
            max={hojeStr()}
            required
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/60"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-foreground/90">Variação (%)</span>
          <input
            name="variacaoDia"
            type="text"
            inputMode="decimal"
            placeholder="0,20 ou -0,15"
            required
            className="w-32 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/60"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gold px-3 py-2 text-xs font-semibold text-ink transition hover:brightness-110 disabled:opacity-50"
        >
          {pending ? "Lançando..." : "Lançar"}
        </button>
      </form>

      {state?.error && <p className="mt-2 text-sm text-red-400">{state.error}</p>}
      {state?.sucesso && <p className="mt-2 text-sm text-emerald-400">{state.sucesso}</p>}

      <div className="mt-4 max-h-72 space-y-1 overflow-y-auto">
        {pontos.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma variação lançada ainda.</p>
        ) : (
          pontos.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-border/70 bg-surface-2 px-3 py-2 text-sm"
            >
              <span className="text-muted">{formatData(p.data)}</span>
              <span className={p.variacaoDia >= 0 ? "font-semibold text-emerald-300" : "font-semibold text-red-300"}>
                {p.variacaoDia >= 0 ? "+" : ""}
                {p.variacaoDia.toFixed(2)}%
              </span>
              <button
                type="button"
                disabled={excluindoPending}
                onClick={() => startTransition(() => excluirPontoAction(p.id))}
                className="rounded-lg border border-border/60 px-2 py-0.5 text-xs text-muted hover:border-red-500/40 hover:text-red-300 disabled:opacity-50"
              >
                Excluir
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
