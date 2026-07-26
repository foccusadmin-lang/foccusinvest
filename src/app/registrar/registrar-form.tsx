"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { registrarConta } from "./actions";

export function RegistrarForm() {
  const [state, action, pending] = useActionState(registrarConta, undefined);

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
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-foreground/90">Senha</span>
        <input
          name="senha"
          type="password"
          required
          minLength={8}
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-gold/60"
        />
        <span className="mt-1 block text-xs text-muted">
          Mínimo 8 caracteres, com letras e números.
        </span>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-foreground/90">Confirmar senha</span>
        <input
          name="confirmarSenha"
          type="password"
          required
          minLength={8}
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-gold/60"
        />
      </label>

      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}

      <Button type="submit" variant="gold" className="w-full" disabled={pending}>
        {pending ? "Criando conta..." : "Criar conta"}
      </Button>
    </form>
  );
}
