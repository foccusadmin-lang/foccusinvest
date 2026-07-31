"use client";

import { useState, useTransition } from "react";
import { adicionarIndicacaoPropria } from "@/app/painel/actions";

export function LancarIndicacaoButton({ aplicacaoId }: { aplicacaoId: string }) {
  const [aberto, setAberto] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  if (mensagem?.tipo === "sucesso") {
    return <span className="text-xs text-emerald-400">{mensagem.texto}</span>;
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="rounded-lg bg-fuchsia-500/15 px-2 py-1 text-xs font-semibold text-fuchsia-300 hover:bg-fuchsia-500/25"
      >
        Lançar código bônus
      </button>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-1">
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          placeholder="Código do indicador"
          className="w-28 rounded-lg border border-border bg-surface-2 px-2 py-1 text-xs uppercase text-foreground outline-none focus:border-gold/60"
        />
        <button
          type="button"
          disabled={isPending || !codigo.trim()}
          onClick={() => {
            setMensagem(null);
            startTransition(async () => {
              const resultado = await adicionarIndicacaoPropria(aplicacaoId, codigo);
              if (resultado.error) setMensagem({ tipo: "erro", texto: resultado.error });
              else setMensagem({ tipo: "sucesso", texto: resultado.sucesso ?? "Feito." });
            });
          }}
          className="rounded-lg bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50"
        >
          Enviar
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="rounded-lg bg-white/10 px-2 py-1 text-xs font-semibold text-muted hover:bg-white/15"
        >
          X
        </button>
      </div>
      {mensagem && <span className="max-w-[160px] text-[11px] text-red-400">{mensagem.texto}</span>}
    </div>
  );
}
