"use client";

import { useActionState } from "react";
import { salvarEstrategiaAction, type EstrategiaState } from "./actions";

type Estrategia = {
  id: string;
  nome: string;
  moedas: string;
  esperadoMin: number;
  esperadoMax: number;
  ativa: boolean;
} | null;

export function EstrategiaForm({ estrategia }: { estrategia: Estrategia }) {
  const [state, action, pending] = useActionState<EstrategiaState, FormData>(
    salvarEstrategiaAction,
    undefined
  );

  return (
    <form action={action} className="space-y-3">
      {estrategia && <input type="hidden" name="id" value={estrategia.id} />}

      <label className="block text-sm">
        <span className="mb-1 block text-xs font-medium text-foreground/90">Nome</span>
        <input
          name="nome"
          type="text"
          defaultValue={estrategia?.nome ?? "Estratégia WEM"}
          required
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/60"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-xs font-medium text-foreground/90">Moedas trabalhadas</span>
        <input
          name="moedas"
          type="text"
          defaultValue={estrategia?.moedas ?? "USD, EUR, XAU (Ouro)"}
          required
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/60"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-foreground/90">Esperado mín. (%)</span>
          <input
            name="esperadoMin"
            type="text"
            inputMode="decimal"
            defaultValue={String(estrategia?.esperadoMin ?? 1.5).replace(".", ",")}
            required
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/60"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-foreground/90">Esperado máx. (%)</span>
          <input
            name="esperadoMax"
            type="text"
            inputMode="decimal"
            defaultValue={String(estrategia?.esperadoMax ?? 4.0).replace(".", ",")}
            required
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/60"
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="ativa"
          value="1"
          defaultChecked={estrategia?.ativa ?? true}
          className="h-4 w-4"
        />
        <span className="text-foreground/90">
          Ao vivo (visível no painel dos investidores com o selo LIVE)
        </span>
      </label>

      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state?.sucesso && <p className="text-sm text-emerald-400">{state.sucesso}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-ink transition hover:brightness-110 disabled:opacity-50"
      >
        {pending ? "Salvando..." : "Salvar estratégia"}
      </button>
    </form>
  );
}
