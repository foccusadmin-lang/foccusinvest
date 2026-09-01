"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { salvarBenchmarkAction, type BenchmarkState } from "./actions";
import { LABEL_INDICADOR, ORDEM_INDICADORES } from "@/lib/indices-mercado-catalogo";

function mesAtualStr(): string {
  return new Date().toISOString().slice(0, 7);
}

export function BenchmarksForm() {
  const [state, action, pending] = useActionState<BenchmarkState, FormData>(salvarBenchmarkAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (state?.sucesso) {
      formRef.current?.reset();
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div>
      <form ref={formRef} action={action} className="flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-foreground/90">Índice</span>
          <select
            name="indicador"
            required
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/60"
          >
            {ORDEM_INDICADORES.map((codigo) => (
              <option key={codigo} value={codigo}>
                {LABEL_INDICADOR[codigo]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-foreground/90">Mês</span>
          <input
            name="mes"
            type="month"
            defaultValue={mesAtualStr()}
            max={mesAtualStr()}
            required
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/60"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-foreground/90">Valor no mês (%)</span>
          <input
            name="valorPercentual"
            type="text"
            inputMode="decimal"
            placeholder="0,90"
            required
            className="w-32 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/60"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gold px-3 py-2 text-xs font-semibold text-ink transition hover:brightness-110 disabled:opacity-50"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
      </form>

      {state?.error && <p className="mt-2 text-sm text-red-400">{state.error}</p>}
      {state?.sucesso && <p className="mt-2 text-sm text-emerald-400">{state.sucesso}</p>}
    </div>
  );
}
