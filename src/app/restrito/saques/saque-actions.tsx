"use client";

import { useTransition } from "react";
import type { StatusSaque } from "@prisma/client";
import { aprovarSaque, recusarSaque, marcarSaquePago } from "./actions";

export function SaqueActions({ saqueId, status }: { saqueId: string; status: StatusSaque }) {
  const [isPending, startTransition] = useTransition();

  const recusar = () => {
    const justificativa = window.prompt("Motivo da recusa (visível ao investidor):");
    if (!justificativa) return;
    startTransition(() => recusarSaque(saqueId, justificativa));
  };

  return (
    <div className="flex flex-wrap gap-2">
      {status === "SOLICITADO" && (
        <button
          disabled={isPending}
          onClick={() => startTransition(() => aprovarSaque(saqueId))}
          className="rounded-lg bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-300 hover:bg-sky-500/25 disabled:opacity-50"
        >
          Aprovar
        </button>
      )}
      {status === "AGUARDANDO_PAGAMENTO" && (
        <button
          disabled={isPending}
          onClick={() => startTransition(() => marcarSaquePago(saqueId))}
          className="rounded-lg bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50"
        >
          Marcar como pago
        </button>
      )}
      {(status === "SOLICITADO" || status === "AGUARDANDO_PAGAMENTO") && (
        <button
          disabled={isPending}
          onClick={recusar}
          className="rounded-lg bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/25 disabled:opacity-50"
        >
          Recusar
        </button>
      )}
    </div>
  );
}
