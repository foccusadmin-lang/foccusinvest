"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { promoverLiderAction } from "./actions";

export function PromoverLiderButton() {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black hover:brightness-110"
      >
        + Promover líder
      </button>
      {aberto && <PromoverLiderModal onClose={() => setAberto(false)} />}
    </>
  );
}

function PromoverLiderModal({ onClose }: { onClose: () => void }) {
  const [state, action, pending] = useActionState(promoverLiderAction, undefined);
  const router = useRouter();
  const processado = useRef(false);

  useEffect(() => {
    if (state?.sucesso && !processado.current) {
      processado.current = true;
      router.refresh();
      const timeout = setTimeout(onClose, 1800);
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-gold/40 bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gold-light">Promover a líder</h3>
        <p className="mt-1 text-sm text-muted">
          Informe o código de indicação ou o e-mail do investidor que vai virar líder.
        </p>

        {state?.sucesso ? (
          <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {state.sucesso}
          </p>
        ) : (
          <form action={action} className="mt-4 space-y-4">
            <input
              name="codigoOuEmail"
              type="text"
              placeholder="Código de indicação ou e-mail"
              autoFocus
              required
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-gold/60"
            />

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
                disabled={pending}
                className="flex-1 rounded-xl bg-gold py-3 text-sm font-semibold text-black hover:brightness-110 disabled:opacity-50"
              >
                {pending ? "Promovendo..." : "Promover"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
