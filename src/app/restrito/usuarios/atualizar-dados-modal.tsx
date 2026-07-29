"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { atualizarDadosUsuario } from "./gerenciar-actions";

type Usuario = {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  endereco: string;
};

export function AtualizarDadosButton({ usuario }: { usuario: Usuario }) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        title="Atualizar dados"
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300 transition hover:bg-sky-500/25"
      >
        ✎
      </button>
      {aberto && <AtualizarDadosModal usuario={usuario} onClose={() => setAberto(false)} />}
    </>
  );
}

function AtualizarDadosModal({ usuario, onClose }: { usuario: Usuario; onClose: () => void }) {
  const [state, action, pending] = useActionState(atualizarDadosUsuario, undefined);
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
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-foreground">Atualizar dados</h3>
        <p className="mt-1 text-xs text-muted">
          CPF/CNPJ e data de nascimento não podem ser alterados por aqui.
        </p>

        {state?.sucesso ? (
          <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {state.sucesso}
          </p>
        ) : (
          <form action={action} className="mt-4 space-y-4">
            <input type="hidden" name="userId" value={usuario.id} />

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground/90">Nome / Razão social</span>
              <input
                name="nome"
                type="text"
                defaultValue={usuario.nome}
                required
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-gold/60"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground/90">E-mail</span>
              <input
                name="email"
                type="email"
                defaultValue={usuario.email}
                required
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-gold/60"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground/90">Telefone</span>
              <input
                name="telefone"
                type="text"
                defaultValue={usuario.telefone}
                placeholder="(00) 00000-0000"
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-gold/60"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-foreground/90">Endereço</span>
              <input
                name="endereco"
                type="text"
                defaultValue={usuario.endereco}
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-gold/60"
              />
            </label>

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
                className="flex-1 rounded-xl bg-gradient-to-br from-[#f2d675] via-[#d4af37] to-[#93731f] py-3 text-sm font-semibold text-black disabled:opacity-50"
              >
                {pending ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
