"use client";

import { useActionState, useState, useTransition } from "react";
import { IconSettings, IconPlus } from "@/components/icons";
import { definirIndicadoPor, removerIndicadoPor } from "./actions";

function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" />
    </svg>
  );
}

export function IndicadoPorActions({
  userId,
  indicadoPorAtual,
}: {
  userId: string;
  indicadoPorAtual: { nome: string; codigo: string | null } | null;
}) {
  const [editando, setEditando] = useState(false);
  const [state, action, pending] = useActionState(definirIndicadoPor, undefined);
  const [isPending, startTransition] = useTransition();

  if (editando) {
    return (
      <form action={action} className="flex items-center gap-1">
        <input type="hidden" name="userId" value={userId} />
        <input
          name="codigoIndicador"
          defaultValue={indicadoPorAtual?.codigo ?? ""}
          placeholder="Código do indicador"
          autoFocus
          className="w-32 rounded-lg border border-border bg-surface-2 px-2 py-1 text-xs uppercase text-foreground outline-none focus:border-gold/60"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50"
        >
          Salvar
        </button>
        <button
          type="button"
          onClick={() => setEditando(false)}
          className="rounded-lg bg-white/10 px-2 py-1 text-xs font-semibold text-muted hover:bg-white/15"
        >
          X
        </button>
        {state?.error && <span className="ml-1 text-[11px] text-red-400">{state.error}</span>}
      </form>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted">{indicadoPorAtual ? indicadoPorAtual.nome : "—"}</span>
      {!indicadoPorAtual ? (
        <button
          type="button"
          title="Adicionar indicador"
          onClick={() => setEditando(true)}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
        >
          <IconPlus width={14} height={14} />
        </button>
      ) : (
        <>
          <button
            type="button"
            title="Editar indicador"
            onClick={() => setEditando(true)}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300 hover:bg-sky-500/25"
          >
            <IconSettings width={14} height={14} />
          </button>
          <button
            type="button"
            title="Remover indicador"
            disabled={isPending}
            onClick={() => {
              if (confirm("Remover o vínculo de indicação desse investidor? Ele deixa de aparecer como indicado por alguém.")) {
                startTransition(() => removerIndicadoPor(userId));
              }
            }}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/15 text-red-300 hover:bg-red-500/25 disabled:opacity-40"
          >
            <IconTrash />
          </button>
        </>
      )}
    </div>
  );
}
