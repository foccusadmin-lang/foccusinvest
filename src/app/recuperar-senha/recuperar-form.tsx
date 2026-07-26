"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { solicitarRecuperacao, type RecuperarState } from "./actions";

const estadoInicial: RecuperarState = { status: "idle" };

export function RecuperarForm() {
  const [state, action, pending] = useActionState(solicitarRecuperacao, estadoInicial);

  if (state.status === "enviado") {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-foreground/90">
          Se houver uma conta com esse e-mail, enviamos um link de
          recuperação. Confira sua caixa de entrada.
        </p>
        {state.devLink && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-left text-xs text-amber-200">
            <p className="mb-1 font-semibold uppercase tracking-wider">
              Modo desenvolvimento
            </p>
            <p className="mb-2">
              O envio de e-mail ainda não está configurado. Use o link abaixo
              para testar:
            </p>
            <a href={state.devLink} className="break-all underline">
              {state.devLink}
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-foreground/90">E-mail</span>
        <input
          name="email"
          type="email"
          required
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-gold/60"
        />
      </label>

      {state.status === "erro" && (
        <p className="text-sm text-red-400">{state.error}</p>
      )}

      <Button type="submit" variant="gold" className="w-full" disabled={pending}>
        {pending ? "Enviando..." : "Enviar link de recuperação"}
      </Button>
    </form>
  );
}
