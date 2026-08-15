"use client";

import { useState, useTransition } from "react";
import { liberarBonusIndicacaoManual } from "./actions";

/** Libera o bônus de 5% de indicação de um aporte específico, sem precisar digitar código —
 *  usa o indicador já fixado no cadastro do investidor. Só aparece quando existe um indicador
 *  vinculado e o bônus desse aporte ainda não foi creditado (ver aportes-lista.tsx). */
export function LiberarBonusButton({ aplicacaoId }: { aplicacaoId: string }) {
  const [isPending, startTransition] = useTransition();
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(null);

  if (mensagem?.tipo === "sucesso") {
    return <span className="text-[11px] text-emerald-400">{mensagem.texto}</span>;
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setMensagem(null);
          startTransition(async () => {
            const resultado = await liberarBonusIndicacaoManual(aplicacaoId);
            if (resultado.error) setMensagem({ tipo: "erro", texto: resultado.error });
            else setMensagem({ tipo: "sucesso", texto: resultado.sucesso ?? "Feito." });
          });
        }}
        className="rounded-lg bg-fuchsia-500/15 px-2 py-1 text-xs font-semibold text-fuchsia-300 hover:bg-fuchsia-500/25 disabled:opacity-50"
      >
        {isPending ? "Liberando..." : "Liberar bônus"}
      </button>
      {mensagem?.tipo === "erro" && <span className="text-[11px] text-red-400">{mensagem.texto}</span>}
    </div>
  );
}
