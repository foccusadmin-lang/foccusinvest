"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { lancarDistribuicao } from "./actions";

export function DistribuicaoForm() {
  const [state, action, pending] = useActionState(lancarDistribuicao, undefined);

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-foreground/90">Início do período</span>
          <input
            name="periodoInicio"
            type="date"
            required
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-gold/60"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-foreground/90">Fim do período</span>
          <input
            name="periodoFim"
            type="date"
            required
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-gold/60"
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-foreground/90">
          Percentual do resultado (%)
        </span>
        <input
          name="percentual"
          type="text"
          inputMode="decimal"
          placeholder="Ex: 3"
          required
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-gold/60"
        />
        <span className="mt-1 block text-xs text-muted">
          Cada investidor recebe esse percentual sobre o próprio capital (ex: 3% = R$30 para
          quem tem R$1.000). O sistema só dilui o pagamento em fatias diárias ao longo do
          período — o percentual não muda depois de lançado.
        </span>
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-foreground/90">
          Resultado apurado (base desta distribuição)
        </span>
        <textarea
          name="resultadoApurado"
          required
          rows={3}
          placeholder="Ex: Lucro líquido de julho/2026 apurado em balancete, conforme documento anexo."
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-gold/60"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-foreground/90">
          Observações (opcional)
        </span>
        <textarea
          name="observacoes"
          rows={2}
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-gold/60"
        />
      </label>

      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state?.sucesso && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          {state.sucesso}
        </p>
      )}

      <Button type="submit" variant="gold" className="w-full sm:w-auto" disabled={pending}>
        {pending ? "Lançando..." : "Lançar distribuição"}
      </Button>
    </form>
  );
}
