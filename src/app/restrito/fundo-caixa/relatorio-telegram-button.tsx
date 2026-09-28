"use client";

import { useState, useTransition } from "react";
import { testarRelatorioDiarioTelegram } from "./actions";

export function RelatorioTelegramButton() {
  const [isPending, startTransition] = useTransition();
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  function enviar() {
    setMensagem(null);
    startTransition(async () => {
      const resultado = await testarRelatorioDiarioTelegram();
      if (resultado.error) setMensagem({ tipo: "erro", texto: resultado.error });
      else setMensagem({ tipo: "ok", texto: resultado.sucesso ?? "Enviado." });
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={enviar}
        disabled={isPending}
        className="rounded-lg bg-sky-500/15 px-3 py-2 text-xs font-semibold text-sky-300 hover:bg-sky-500/25 disabled:opacity-50"
      >
        {isPending ? "Enviando..." : "Testar relatório no Telegram"}
      </button>
      {mensagem && (
        <span className={`text-xs ${mensagem.tipo === "ok" ? "text-emerald-300" : "text-red-400"}`}>
          {mensagem.texto}
        </span>
      )}
    </div>
  );
}
