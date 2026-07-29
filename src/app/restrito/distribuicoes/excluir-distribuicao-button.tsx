"use client";

import { useState, useTransition } from "react";
import { excluirDistribuicao } from "./actions";

export function ExcluirDistribuicaoButton({ distribuicaoId }: { distribuicaoId: string }) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function confirmarExclusao() {
    if (
      !confirm(
        "Apagar essa distribuição? Remove também o rendimento já diluído a partir dela (se ainda não usado/reservado). Não pode ser desfeito."
      )
    ) {
      return;
    }
    setErro(null);
    startTransition(async () => {
      const resultado = await excluirDistribuicao(distribuicaoId);
      if (resultado.error) setErro(resultado.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={confirmarExclusao}
        className="rounded-lg bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/25 disabled:opacity-50"
      >
        Apagar
      </button>
      {erro && <p className="max-w-[220px] text-right text-[11px] text-red-400">{erro}</p>}
    </div>
  );
}
