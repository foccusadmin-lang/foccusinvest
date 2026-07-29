"use client";

import { useState, useTransition } from "react";
import { excluirCreditoPlrIndividual } from "./actions";

export function ExcluirCreditoButton({ creditoId }: { creditoId: string }) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (!confirm("Apagar esse lançamento de PLR? O valor sai da carteira do investidor.")) return;
          setErro(null);
          startTransition(async () => {
            try {
              await excluirCreditoPlrIndividual(creditoId);
            } catch (e) {
              setErro((e as Error).message);
            }
          });
        }}
        className="rounded-lg bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/25 disabled:opacity-50"
      >
        Apagar
      </button>
      {erro && <p className="max-w-[180px] text-right text-[11px] text-red-400">{erro}</p>}
    </div>
  );
}
