"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { criarUsuarioPorEmail } from "./actions";

export function CriarUsuarioForm() {
  const [state, action, pending] = useActionState(criarUsuarioPorEmail, undefined);

  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-foreground/90">Nome (opcional)</span>
        <input
          name="nome"
          type="text"
          placeholder="Nome do investidor"
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-gold/60"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-foreground/90">E-mail</span>
        <input
          name="email"
          type="email"
          required
          placeholder="investidor@email.com"
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-gold/60"
        />
      </label>

      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}

      {state?.sucesso && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          <p>{state.sucesso}</p>
          <p className="mt-1 text-xs text-emerald-300/80">
            Peça pra pessoa entrar em foccusinvest.com.br e clicar em &quot;Entrar com
            Google&quot; usando esse mesmo e-mail — o acesso é vinculado automaticamente,
            sem precisar de senha.
          </p>
        </div>
      )}

      <Button type="submit" variant="gold" className="w-full sm:w-auto" disabled={pending}>
        {pending ? "Criando..." : "Criar conta"}
      </Button>
    </form>
  );
}
