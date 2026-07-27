"use client";

import { useTransition } from "react";
import { cancelarMigracaoPendente } from "./actions";

export function CancelarMigracaoButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() => {
        if (confirm("Cancelar esta reserva de saldo migrado?")) {
          startTransition(() => cancelarMigracaoPendente(id));
        }
      }}
      className="rounded-lg bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/25 disabled:opacity-50"
    >
      Cancelar
    </button>
  );
}
