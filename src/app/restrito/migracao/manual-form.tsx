"use client";

import { useState, useActionState } from "react";
import { lancarMigracaoManual } from "./actions";

export function ManualForm({
  migracaoId,
  emailSugerido,
}: {
  migracaoId: string;
  emailSugerido?: string | null;
}) {
  const [aberto, setAberto] = useState(false);
  const [state, action, pending] = useActionState(lancarMigracaoManual, undefined);

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="rounded-lg bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/25"
      >
        Lançar manual
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-col items-end gap-2">
      <input type="hidden" name="migracaoId" value={migracaoId} />
      <div className="flex gap-2">
        <input
          name="email"
          type="email"
          required
          defaultValue={emailSugerido ?? ""}
          placeholder="e-mail da conta do investidor"
          className="w-56 rounded-lg border border-border bg-surface-2 px-2 py-1 text-xs text-foreground outline-none focus:border-gold/60"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/25 disabled:opacity-50"
        >
          {pending ? "Lançando..." : "Confirmar"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="rounded-lg bg-white/10 px-3 py-1 text-xs font-semibold text-muted hover:bg-white/15"
        >
          Cancelar
        </button>
      </div>
      {state?.error && <p className="text-xs text-red-400">{state.error}</p>}
      {state?.sucesso && <p className="text-xs text-emerald-300">{state.sucesso}</p>}
    </form>
  );
}
