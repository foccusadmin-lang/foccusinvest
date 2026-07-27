"use client";

import { useTransition } from "react";
import { aprovarMigracao, cancelarMigracaoPendente } from "./actions";

export function AprovarRejeitarButtons({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex justify-end gap-2">
      <button
        disabled={isPending}
        onClick={() => startTransition(() => aprovarMigracao(id))}
        className="rounded-lg bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50"
      >
        Aprovar
      </button>
      <button
        disabled={isPending}
        onClick={() => {
          if (confirm("Rejeitar este lançamento? O valor não será creditado.")) {
            startTransition(() => cancelarMigracaoPendente(id));
          }
        }}
        className="rounded-lg bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/25 disabled:opacity-50"
      >
        Rejeitar
      </button>
    </div>
  );
}
