"use client";

import { useEffect } from "react";
import { ehErroDeAcaoObsoleta, recarregarSeNecessario } from "@/lib/acao-obsoleta";

/** Escuta erros não tratados do navegador e, se for a Server Action de um build antigo (aba
 *  aberta antes de um deploy), recarrega a página sozinho pra pegar a versão nova. */
export function RecarregarSeDesatualizado() {
  useEffect(() => {
    function aoRejeitar(ev: PromiseRejectionEvent) {
      if (ehErroDeAcaoObsoleta(ev.reason)) recarregarSeNecessario();
    }
    function aoErro(ev: ErrorEvent) {
      if (ehErroDeAcaoObsoleta(ev.error ?? ev.message)) recarregarSeNecessario();
    }
    window.addEventListener("unhandledrejection", aoRejeitar);
    window.addEventListener("error", aoErro);
    return () => {
      window.removeEventListener("unhandledrejection", aoRejeitar);
      window.removeEventListener("error", aoErro);
    };
  }, []);

  return null;
}
