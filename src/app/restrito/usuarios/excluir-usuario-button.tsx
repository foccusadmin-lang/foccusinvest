"use client";

import { useState, useTransition } from "react";
import { excluirUsuario } from "./gerenciar-actions";

export function ExcluirUsuarioButton({ userId, nome }: { userId: string; nome: string }) {
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function confirmarExclusao() {
    const digitado = prompt(
      `Isso vai apagar PERMANENTEMENTE a conta de ${nome} e todo o histórico (aplicações, saques, créditos). Não pode ser desfeito.\n\nDigite EXCLUIR para confirmar:`
    );
    if (digitado !== "EXCLUIR") return;

    setErro(null);
    startTransition(async () => {
      const resultado = await excluirUsuario(userId);
      if (resultado.error) setErro(resultado.error);
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={confirmarExclusao}
        disabled={isPending}
        title="Excluir usuário"
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/15 text-red-300 transition hover:bg-red-500/25 disabled:opacity-50"
      >
        ✕
      </button>
      {erro && <span className="max-w-[140px] text-[11px] text-red-400">{erro}</span>}
    </div>
  );
}
