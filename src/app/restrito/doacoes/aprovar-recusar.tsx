"use client";

import { useState, useTransition } from "react";
import { aprovarDoacao, recusarDoacao } from "./actions";

export function AprovarRecusarDoacao({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const [recusando, setRecusando] = useState(false);
  const [motivo, setMotivo] = useState("");

  if (recusando) {
    return (
      <div className="flex flex-col items-end gap-2">
        <input
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Motivo da recusa"
          className="w-56 rounded-lg border border-border bg-surface-2 px-2 py-1 text-xs text-foreground outline-none focus:border-gold/60"
        />
        <div className="flex gap-2">
          <button
            disabled={isPending}
            onClick={() => startTransition(() => recusarDoacao(id, motivo))}
            className="rounded-lg bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/25 disabled:opacity-50"
          >
            Confirmar recusa
          </button>
          <button
            onClick={() => setRecusando(false)}
            className="rounded-lg bg-white/10 px-3 py-1 text-xs font-semibold text-muted hover:bg-white/15"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end gap-2">
      <button
        disabled={isPending}
        onClick={() => startTransition(() => aprovarDoacao(id))}
        className="rounded-lg bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50"
      >
        Aprovar
      </button>
      <button
        disabled={isPending}
        onClick={() => setRecusando(true)}
        className="rounded-lg bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/25 disabled:opacity-50"
      >
        Recusar
      </button>
    </div>
  );
}
