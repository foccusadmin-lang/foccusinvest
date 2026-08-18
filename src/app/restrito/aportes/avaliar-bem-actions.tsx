"use client";

import { useState, useTransition } from "react";
import { MoneyInput } from "@/components/ui/money-input";
import { aprovarAporte, rejeitarAporte } from "./actions";

/** Avaliação de um aporte em bem (imóvel/automóvel/eletrônico) — o admin confirma o valor final
 *  (pode ajustar pra cima ou pra baixo em relação ao declarado, de acordo com o estado do bem
 *  avaliado) e a carência em meses (pré-preenchida com o padrão da categoria, também ajustável). */
export function AvaliarAporteBemButton({
  id,
  valorDeclarado,
  mesesPadrao,
}: {
  id: string;
  valorDeclarado: number;
  mesesPadrao: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [modo, setModo] = useState<"fechado" | "avaliando" | "rejeitando">("fechado");
  const [valorTexto, setValorTexto] = useState(
    valorDeclarado.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
  const [meses, setMeses] = useState(String(mesesPadrao));
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  if (modo === "rejeitando") {
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
            onClick={() => setModo("fechado")}
            className="rounded-lg bg-white/10 px-3 py-1 text-xs font-semibold text-muted hover:bg-white/15"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (modo === "avaliando") {
    const valorNumerico = Number(valorTexto.replace(/\./g, "").replace(",", ".")) || 0;
    const mesesNumerico = Number(meses) || 0;

    return (
      <div className="flex w-64 flex-col items-end gap-2 rounded-lg border border-gold/30 bg-surface-2 p-3">
        <label className="w-full text-left text-xs">
          <span className="mb-0.5 block text-muted">Valor final (avaliado)</span>
          <MoneyInput
            value={valorTexto}
            onValueChange={setValorTexto}
            className="w-full rounded-lg border border-border bg-surface px-2 py-1 text-xs text-foreground outline-none focus:border-gold/60"
          />
        </label>
        <label className="w-full text-left text-xs">
          <span className="mb-0.5 block text-muted">Carência (meses)</span>
          <input
            value={meses}
            onChange={(e) => setMeses(e.target.value.replace(/\D/g, ""))}
            type="text"
            inputMode="numeric"
            className="w-full rounded-lg border border-border bg-surface px-2 py-1 text-xs text-foreground outline-none focus:border-gold/60"
          />
        </label>
        {erro && <p className="text-[11px] text-red-400">{erro}</p>}
        <div className="flex gap-2">
          <button
            disabled={isPending}
            onClick={() => {
              if (!valorNumerico || valorNumerico <= 0) {
                setErro("Informe um valor final válido.");
                return;
              }
              if (!mesesNumerico || mesesNumerico <= 0) {
                setErro("Informe uma carência válida.");
                return;
              }
              setErro(null);
              startTransition(() =>
                aprovarAporte(id, { valor: valorNumerico, mesesCarencia: mesesNumerico })
              );
            }}
            className="rounded-lg bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50"
          >
            {isPending ? "Confirmando..." : "Confirmar avaliação"}
          </button>
          <button
            onClick={() => setModo("fechado")}
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
        onClick={() => setModo("avaliando")}
        className="rounded-lg bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50"
      >
        Avaliar e confirmar
      </button>
      <button
        disabled={isPending}
        onClick={() => setModo("rejeitando")}
        className="rounded-lg bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/25 disabled:opacity-50"
      >
        Rejeitar
      </button>
    </div>
  );
}
