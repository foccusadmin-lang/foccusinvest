"use client";

import { useEffect, useState } from "react";
import { marcarGrupoFoccusVisto } from "@/app/painel/guia-actions";
import { LINK_GRUPO_FOCCUS } from "@/lib/config";
import { IconWhatsapp } from "@/components/icons";

/** Modal de convite pro Grupo Foccus (WhatsApp), mostrado uma única vez pra cada investidor —
 *  seja qual for o botão usado pra sair (acessar o grupo ou só fechar), marca como visto e
 *  nunca mais aparece pra essa conta (ver marcarGrupoFoccusVisto, em painel/guia-actions.ts). */
export function GrupoFoccusModal({ ativoInicial }: { ativoInicial: boolean }) {
  const [aberto, setAberto] = useState(false);

  // Só liga depois do mount, dando tempo do resto da página carregar antes de cobrir a tela.
  useEffect(() => {
    if (!ativoInicial) return;
    const timeout = setTimeout(() => setAberto(true), 900);
    return () => clearTimeout(timeout);
  }, [ativoInicial]);

  function fechar() {
    setAberto(false);
    marcarGrupoFoccusVisto();
  }

  function acessarGrupo() {
    window.open(LINK_GRUPO_FOCCUS, "_blank", "noopener,noreferrer");
    fechar();
  }

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={fechar}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-emerald-500/30 bg-surface p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
          <IconWhatsapp width={24} height={24} />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-foreground">Grupo Foccus no WhatsApp</h3>
        <p className="mt-2 text-sm text-muted">
          Entre no nosso grupo oficial pra receber avisos, atualizações e novidades da Foccus
          Invest em primeira mão. Se você já faz parte, pode só fechar essa janela.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={acessarGrupo}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black hover:brightness-110"
          >
            <IconWhatsapp width={16} height={16} /> Acessar grupo
          </button>
          <button
            onClick={fechar}
            className="w-full rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-white/15"
          >
            Já faço parte, fechar
          </button>
        </div>
      </div>
    </div>
  );
}
