"use client";

import { useState, useTransition } from "react";
import { aprovarAporte, rejeitarAporte } from "./actions";

export function AprovarRejeitarAporte({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const [rejeitando, setRejeitando] = useState(false);
  const [motivo, setMotivo] = useState("");

  if (rejeitando) {
    return (
      <div className="flex flex-col items-end gap-2">
        <input
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Motivo da rejeição"
          className="w-56 rounded-lg border border-border bg-surface-2 px-2 py-1 text-xs text-foreground outline-none focus:border-gold/60"
        />
        <div className="flex gap-2">
          <button
            disabled={isPending}
            onClick={() => startTransition(() => rejeitarAporte(id, motivo))}
            className="rounded-lg bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/25 disabled:opacity-50"
          >
            Confirmar rejeição
          </button>
          <button
            onClick={() => setRejeitando(false)}
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
        onClick={() => startTransition(() => aprovarAporte(id))}
        className="rounded-lg bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50"
      >
        Aprovar
      </button>
      <button
        disabled={isPending}
        onClick={() => setRejeitando(true)}
        className="rounded-lg bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/25 disabled:opacity-50"
      >
        Rejeitar
      </button>
    </div>
  );
}
