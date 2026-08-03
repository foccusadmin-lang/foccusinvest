"use client";

import { useState } from "react";

function IconShare() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5 15.4 17.5M15.4 6.5 8.6 10.5" />
    </svg>
  );
}

export function ConvidarAmigoButton({ codigoIndicacao }: { codigoIndicacao: string }) {
  const [estado, setEstado] = useState<"idle" | "copiado" | "erro">("idle");

  async function convidar() {
    const link = `${window.location.origin}/registrar?ref=${codigoIndicacao}`;
    const texto = "Venha investir comigo na Foccus Invest! Se cadastra pelo meu link:";

    if (navigator.share) {
      try {
        await navigator.share({ title: "Foccus Invest", text: texto, url: link });
      } catch {
        // usuário cancelou o compartilhamento — sem problema
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(link);
      setEstado("copiado");
      setTimeout(() => setEstado("idle"), 2200);
    } catch {
      setEstado("erro");
      setTimeout(() => setEstado("idle"), 2200);
    }
  }

  return (
    <button
      type="button"
      onClick={convidar}
      className="flex items-center gap-2 rounded-xl bg-gold/15 px-4 py-2 text-sm font-semibold text-gold-light transition hover:bg-gold/25"
    >
      <IconShare />
      {estado === "copiado" ? "Link copiado!" : estado === "erro" ? "Não deu pra copiar" : "Convidar amigo"}
    </button>
  );
}
