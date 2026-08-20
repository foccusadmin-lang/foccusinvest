"use client";

import { useEffect, useState } from "react";
import { IconWhatsapp, IconCopy, IconShare } from "@/components/icons";
import { extrairIdYoutube, type Tutorial } from "@/lib/tutoriais";

export function TutorialCard({ tutorial }: { tutorial: Tutorial }) {
  const [copiado, setCopiado] = useState(false);
  // Só decide depois de montar no cliente — evita divergência entre o HTML do servidor (onde
  // `navigator` não existe) e o do cliente, que causaria erro de hidratação.
  const [suportaShareNativo, setSuportaShareNativo] = useState(false);
  useEffect(() => {
    setSuportaShareNativo(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  const id = extrairIdYoutube(tutorial.url);
  const thumbnail = id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
  const mensagem = `${tutorial.titulo} — Foccus Invest\n${tutorial.url}`;

  function copiarLink() {
    navigator.clipboard.writeText(tutorial.url).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  function compartilharNativo() {
    navigator.share?.({ title: tutorial.titulo, text: tutorial.titulo, url: tutorial.url }).catch(() => {});
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <a href={tutorial.url} target="_blank" rel="noopener noreferrer" className="block">
        <div className="relative aspect-video w-full bg-surface-2">
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnail} alt={tutorial.titulo} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted">
              Vídeo indisponível
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition hover:bg-black/10">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold text-ink shadow-lg">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7Z" />
              </svg>
            </span>
          </div>
        </div>
      </a>

      <div className="p-4">
        <h3 className="text-sm font-semibold text-foreground">{tutorial.titulo}</h3>

        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(mensagem)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25"
          >
            <IconWhatsapp width={14} height={14} /> WhatsApp
          </a>
          <button
            type="button"
            onClick={copiarLink}
            className="flex items-center gap-1.5 rounded-lg bg-sky-500/15 px-2.5 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-500/25"
          >
            <IconCopy width={14} height={14} /> {copiado ? "Copiado!" : "Copiar link"}
          </button>
          {suportaShareNativo && (
            <button
              type="button"
              onClick={compartilharNativo}
              className="flex items-center gap-1.5 rounded-lg bg-gold/15 px-2.5 py-1.5 text-xs font-semibold text-gold-light hover:bg-gold/25"
            >
              <IconShare width={14} height={14} /> Mais opções
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
