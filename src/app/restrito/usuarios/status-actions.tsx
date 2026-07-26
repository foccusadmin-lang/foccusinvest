"use client";

import { useTransition } from "react";
import type { PerfilUsuario, StatusCadastro } from "@prisma/client";
import { alterarStatusCadastro, alterarPerfil } from "./actions";

export function StatusActions({
  usuarioId,
  statusCadastro,
  perfil,
}: {
  usuarioId: string;
  statusCadastro: StatusCadastro;
  perfil: PerfilUsuario;
}) {
  const [isPending, startTransition] = useTransition();

  if (statusCadastro === "INCOMPLETO") {
    return (
      <span className="text-xs italic text-muted">
        Aguardando o usuário terminar o cadastro (nome, CPF/CNPJ, documentos)
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {statusCadastro === "PENDENTE" && (
        <button
          disabled={isPending}
          onClick={() =>
            startTransition(() => alterarStatusCadastro(usuarioId, "APROVADO"))
          }
          className="rounded-lg bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50"
        >
          Aprovar
        </button>
      )}
      {statusCadastro !== "SUSPENSO" && statusCadastro !== "INCOMPLETO" && (
        <button
          disabled={isPending}
          onClick={() =>
            startTransition(() => alterarStatusCadastro(usuarioId, "SUSPENSO"))
          }
          className="rounded-lg bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/25 disabled:opacity-50"
        >
          Suspender
        </button>
      )}
      {statusCadastro === "SUSPENSO" && (
        <button
          disabled={isPending}
          onClick={() =>
            startTransition(() => alterarStatusCadastro(usuarioId, "APROVADO"))
          }
          className="rounded-lg bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-300 hover:bg-sky-500/25 disabled:opacity-50"
        >
          Reativar
        </button>
      )}
      {perfil === "USUARIO" && statusCadastro === "APROVADO" && (
        <button
          disabled={isPending}
          onClick={() => startTransition(() => alterarPerfil(usuarioId, "LIDER"))}
          className="rounded-lg bg-gold/15 px-3 py-1 text-xs font-semibold text-gold-light hover:bg-gold/25 disabled:opacity-50"
        >
          Promover a líder
        </button>
      )}
      {perfil === "LIDER" && (
        <button
          disabled={isPending}
          onClick={() => startTransition(() => alterarPerfil(usuarioId, "USUARIO"))}
          className="rounded-lg bg-white/10 px-3 py-1 text-xs font-semibold text-muted hover:bg-white/15 disabled:opacity-50"
        >
          Remover liderança
        </button>
      )}
    </div>
  );
}
