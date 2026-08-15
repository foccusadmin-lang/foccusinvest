"use client";

import { useActionState, useEffect, useRef } from "react";
import { criarFaqAction, type FaqState } from "./actions";
import { TOPICOS_GUIA } from "@/lib/guia-conhecimento";

export function NovaFaqForm() {
  const [state, action, pending] = useActionState<FaqState, FormData>(criarFaqAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.sucesso) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <label className="block text-sm">
        <span className="mb-1 block text-xs font-medium text-foreground/90">Tópico</span>
        <select
          name="topico"
          required
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/60"
        >
          {TOPICOS_GUIA.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-xs font-medium text-foreground/90">Pergunta (exemplo)</span>
        <input
          name="pergunta"
          type="text"
          required
          placeholder="Ex: Quando posso sacar meu rendimento?"
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/60"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-xs font-medium text-foreground/90">Resposta</span>
        <textarea
          name="resposta"
          required
          rows={3}
          placeholder="Resposta que o Guia Foccus deve usar como referência"
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/60"
        />
      </label>

      {state?.error && <p className="text-xs text-red-400">{state.error}</p>}
      {state?.sucesso && <p className="text-xs text-emerald-400">{state.sucesso}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-gold px-3 py-2 text-xs font-semibold text-ink transition hover:brightness-110 disabled:opacity-50"
      >
        {pending ? "Salvando..." : "Adicionar FAQ"}
      </button>
    </form>
  );
}
