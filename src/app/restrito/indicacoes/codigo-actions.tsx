"use client";

import { useActionState, useState, useTransition } from "react";
import { IconSettings, IconAlert } from "@/components/icons";
import { alterarCodigoIndicacao, removerCodigoIndicacao, gerarNovoCodigoIndicacao } from "./actions";

function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" />
    </svg>
  );
}

function IconRefresh() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
    </svg>
  );
}

export function CodigoIndicacaoActions({
  userId,
  codigoAtual,
}: {
  userId: string;
  codigoAtual: string | null;
}) {
  const [editando, setEditando] = useState(false);
  const [state, action, pending] = useActionState(alterarCodigoIndicacao, undefined);
  const [isPending, startTransition] = useTransition();

  if (editando) {
    return (
      <form action={action} className="flex items-center gap-1">
        <input type="hidden" name="userId" value={userId} />
        <input
          name="codigo"
          defaultValue={codigoAtual ?? ""}
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
    <div className="flex items-center gap-1">
      <button
        type="button"
        title="Editar código"
        onClick={() => setEditando(true)}
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300 hover:bg-sky-500/25"
      >
        <IconSettings width={14} height={14} />
      </button>
      <button
        type="button"
        title="Remover código"
        disabled={isPending || !codigoAtual}
        onClick={() => {
          if (confirm("Remover o código de indicação desse investidor?")) {
            startTransition(() => removerCodigoIndicacao(userId));
          }
        }}
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/15 text-red-300 hover:bg-red-500/25 disabled:opacity-40"
      >
        <IconTrash />
      </button>
      <button
        type="button"
        title="Gerar novo código automático"
        disabled={isPending}
        onClick={() => startTransition(() => gerarNovoCodigoIndicacao(userId))}
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-40"
      >
        <IconRefresh />
      </button>
    </div>
  );
}
