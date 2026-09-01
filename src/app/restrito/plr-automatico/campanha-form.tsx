"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { criarCampanhaAction, type CampanhaState } from "./actions";

function hojeStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CampanhaForm() {
  const [state, action, pending] = useActionState<CampanhaState, FormData>(criarCampanhaAction, undefined);
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
      <form ref={formRef} action={action} className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-foreground/90">
            Percentual total (%)
          </span>
          <input
            name="percentualTotal"
            type="text"
            inputMode="decimal"
            placeholder="5,00"
            required
            className="w-28 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/60"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-foreground/90">Data início</span>
          <input
            name="periodoInicio"
            type="date"
            defaultValue={hojeStr()}
            required
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/60"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-foreground/90">Data fim</span>
          <input
            name="periodoFim"
            type="date"
            required
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/60"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-foreground/90">
            Horário de lançamento
          </span>
          <input
            name="horarioLancamento"
            type="time"
            defaultValue="19:30"
            required
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/60"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-ink transition hover:brightness-110 disabled:opacity-50"
        >
          {pending ? "Criando..." : "Criar campanha"}
        </button>
      </form>

      <p className="mt-2 text-[11px] text-muted">
        Horário no fuso de Brasília — a checagem só roda uma vez por dia, às 19h45, então um
        horário depois desse ponto materializa no dia seguinte. Criar uma nova campanha desativa
        automaticamente qualquer outra que ainda esteja ativa (os dias dela já lançados continuam
        intactos no histórico).
      </p>

      {state?.error && <p className="mt-2 text-sm text-red-400">{state.error}</p>}
      {state?.sucesso && <p className="mt-2 text-sm text-emerald-400">{state.sucesso}</p>}
    </div>
  );
}
