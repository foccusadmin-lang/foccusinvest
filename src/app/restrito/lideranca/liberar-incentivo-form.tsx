"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoeda } from "@/lib/format";
import { liberarIncentivoLiderancaTodosAction } from "./actions";

type Lider = { id: string; capital: number };

export function LiberarIncentivoTodosButton({ lideres }: { lideres: Lider[] }) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="rounded-lg border border-gold/40 px-4 py-2 text-sm font-semibold text-gold-light hover:bg-gold/10"
      >
        % Liberar incentivo pra todos
      </button>
      {aberto && <LiberarIncentivoTodosModal lideres={lideres} onClose={() => setAberto(false)} />}
    </>
  );
}

function LiberarIncentivoTodosModal({
  lideres,
  onClose,
}: {
  lideres: Lider[];
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(liberarIncentivoLiderancaTodosAction, undefined);
  const [percentualTexto, setPercentualTexto] = useState("0,10");
  const [dataTexto, setDataTexto] = useState(() => new Date().toISOString().slice(0, 10));
  const router = useRouter();
  const processado = useRef(false);

  useEffect(() => {
    if (state?.sucesso && !processado.current) {
      processado.current = true;
      router.refresh();
      const timeout = setTimeout(onClose, 2200);
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const percentual = Number(percentualTexto.replace(",", ".")) || 0;
  const elegiveis = lideres.filter((l) => l.capital > 0);
  const totalEstimado = elegiveis.reduce((acc, l) => acc + l.capital * (percentual / 100), 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-gold/40 bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gold-light">
          Liberar incentivo de liderança pra todos
        </h3>
        <p className="mt-1 text-sm text-muted">
          Mesma regra do PLR: define um percentual e ele é aplicado sobre o capital de cada
          líder — automaticamente, sem precisar selecionar ninguém.
        </p>

        {state?.sucesso ? (
          <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {state.sucesso}
          </p>
        ) : (
          <form action={action} className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-4">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-foreground/90">Percentual (%)</span>
                <input
                  name="percentual"
                  value={percentualTexto}
                  onChange={(e) => setPercentualTexto(e.target.value)}
                  type="text"
                  inputMode="decimal"
                  placeholder="0,10"
                  autoFocus
                  required
                  className="w-full max-w-[140px] rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-gold/60"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-foreground/90">
                  Data do lançamento
                </span>
                <input
                  name="data"
                  value={dataTexto}
                  onChange={(e) => setDataTexto(e.target.value)}
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  required
                  className="w-full max-w-[160px] rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-gold/60"
                />
              </label>
            </div>

            <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-sm text-sky-200">
              <strong>{elegiveis.length}</strong> líder(es) com capital elegível · total estimado:{" "}
              <strong>{formatMoeda(totalEstimado)}</strong>
            </div>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground/90">
                Observação (opcional)
              </span>
              <input
                name="observacao"
                type="text"
                placeholder="Ex: incentivo julho/2026..."
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/60"
              />
            </label>

            {state?.error && <p className="text-sm text-red-400">{state.error}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-border/60 py-3 text-sm font-semibold text-muted hover:text-foreground"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending || elegiveis.length === 0}
                className="flex-1 rounded-xl bg-gradient-to-br from-[#f2d675] via-[#d4af37] to-[#93731f] py-3 text-sm font-semibold text-black hover:brightness-110 disabled:opacity-50"
              >
                {pending ? "Processando..." : `Liberar pra ${elegiveis.length} líder(es)`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
