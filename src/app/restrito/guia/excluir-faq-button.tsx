"use client";

import { useTransition } from "react";
import { excluirFaqAction } from "./actions";

export function ExcluirFaqButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("Excluir esta FAQ?")) startTransition(() => excluirFaqAction(id));
      }}
      className="shrink-0 rounded-lg border border-border/60 px-2 py-1 text-xs text-muted transition hover:border-red-500/40 hover:text-red-300 disabled:opacity-50"
    >
      Excluir
    </button>
  );
}
