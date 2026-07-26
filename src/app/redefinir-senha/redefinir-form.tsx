"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { redefinirSenha } from "./actions";

export function RedefinirForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(redefinirSenha, undefined);

  if (state?.sucesso) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-emerald-300">Senha redefinida com sucesso.</p>
        <Link
          href="/login"
          className="inline-block text-sm text-gold-light hover:underline"
        >
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-foreground/90">Nova senha</span>
        <input
          name="novaSenha"
          type="password"
          required
          minLength={8}
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-gold/60"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-foreground/90">Confirmar nova senha</span>
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
        {pending ? "Salvando..." : "Redefinir senha"}
      </Button>
    </form>
  );
}
