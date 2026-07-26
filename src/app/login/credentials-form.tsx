"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function CredentialsForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-3 text-left"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        setError(null);
        startTransition(async () => {
          const result = await signIn("credentials", {
            email: formData.get("email"),
            password: formData.get("password"),
            redirect: false,
          });
          if (result?.error) {
            setError("E-mail ou senha inválidos.");
          } else {
            router.push(callbackUrl);
            router.refresh();
          }
        });
      }}
    >
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
          name="password"
          type="password"
          required
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-gold/60"
        />
      </label>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex justify-end">
        <a href="/recuperar-senha" className="text-xs text-gold-light hover:underline">
          Esqueci minha senha
        </a>
      </div>

      <Button type="submit" variant="outline" className="w-full" disabled={isPending}>
        {isPending ? "Entrando..." : "Entrar com e-mail e senha"}
      </Button>
    </form>
  );
}
